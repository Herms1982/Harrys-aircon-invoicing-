package za.co.harrysaircon.app.data.repository

import androidx.room.withTransaction
import za.co.harrysaircon.app.data.local.AppDatabase
import za.co.harrysaircon.app.data.local.StockAuditLogEntity
import za.co.harrysaircon.app.data.local.StockEntity
import za.co.harrysaircon.app.domain.scanner.ScannedInvoiceDto
import za.co.harrysaircon.app.domain.scanner.ScannedLineItemDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class ReconciledReviewItem(
    val id: String = java.util.UUID.randomUUID().toString(),
    val rawItem: ScannedLineItemDto,
    val matchedStock: StockEntity?,
    val isSelectedForUpdate: Boolean = true,
    val targetItemCode: String,
    val targetDescription: String,
    val quantityToAdd: Double,
    val newCostPrice: Double,
    val suggestedSellPrice: Double,
    val matchType: MatchType
)

enum class MatchType {
    EXACT_CODE,
    FUZZY_DESCRIPTION,
    NEW_ITEM
}

class StockSyncRepository(
    private val database: AppDatabase
) {
    private val stockDao = database.stockDao()

    /**
     * Correlates scanned items with local stock database to prepare for UI Review
     */
    suspend fun correlateScannedItems(invoice: ScannedInvoiceDto): List<ReconciledReviewItem> =
        withContext(Dispatchers.IO) {
            val allStock = stockDao.getAllStock()

            invoice.lineItems.map { lineItem ->
                // 1. Try Exact SKU/Code match
                val exactMatch = allStock.firstOrNull {
                    it.itemCode.isNotBlank() && it.itemCode.equals(lineItem.itemCode.trim(), ignoreCase = true)
                }

                if (exactMatch != null) {
                    return@map ReconciledReviewItem(
                        rawItem = lineItem,
                        matchedStock = exactMatch,
                        isSelectedForUpdate = true,
                        targetItemCode = exactMatch.itemCode,
                        targetDescription = exactMatch.description,
                        quantityToAdd = lineItem.quantityPurchased.coerceAtLeast(1.0),
                        newCostPrice = lineItem.unitCostPrice,
                        suggestedSellPrice = if (exactMatch.sellingPrice > 0) exactMatch.sellingPrice else (lineItem.unitCostPrice * 1.35),
                        matchType = MatchType.EXACT_CODE
                    )
                }

                // 2. Fuzzy Keyword match across existing stock descriptions
                val fuzzyMatch = findBestFuzzyMatch(lineItem.description, allStock)
                if (fuzzyMatch != null) {
                    return@map ReconciledReviewItem(
                        rawItem = lineItem,
                        matchedStock = fuzzyMatch,
                        isSelectedForUpdate = true,
                        targetItemCode = fuzzyMatch.itemCode,
                        targetDescription = fuzzyMatch.description,
                        quantityToAdd = lineItem.quantityPurchased.coerceAtLeast(1.0),
                        newCostPrice = lineItem.unitCostPrice,
                        suggestedSellPrice = if (fuzzyMatch.sellingPrice > 0) fuzzyMatch.sellingPrice else (lineItem.unitCostPrice * 1.35),
                        matchType = MatchType.FUZZY_DESCRIPTION
                    )
                }

                // 3. Brand New Item not currently in Stock
                ReconciledReviewItem(
                    rawItem = lineItem,
                    matchedStock = null,
                    isSelectedForUpdate = true,
                    targetItemCode = lineItem.itemCode.ifBlank { "NEW-${System.currentTimeMillis() % 10000}" },
                    targetDescription = lineItem.description,
                    quantityToAdd = lineItem.quantityPurchased.coerceAtLeast(1.0),
                    newCostPrice = lineItem.unitCostPrice,
                    suggestedSellPrice = lineItem.unitCostPrice * 1.35, // Default 35% trade markup
                    matchType = MatchType.NEW_ITEM
                )
            }
        }

    /**
     * Executes the atomic Room transaction to restock inventory and log audit trails
     */
    suspend fun processScannedInvoiceToInventory(
        supplierName: String,
        invoiceReference: String,
        itemsToProcess: List<ReconciledReviewItem>
    ): Int = withContext(Dispatchers.IO) {
        database.withTransaction {
            var updatedCount = 0
            val now = System.currentTimeMillis()

            itemsToProcess.filter { it.isSelectedForUpdate }.forEach { reviewItem ->
                if (reviewItem.matchedStock != null) {
                    // Update existing stock
                    val existing = reviewItem.matchedStock
                    val newQty = existing.quantityOnHand + reviewItem.quantityToAdd
                    val updatedStock = existing.copy(
                        quantityOnHand = newQty,
                        unitCostPrice = if (reviewItem.newCostPrice > 0) reviewItem.newCostPrice else existing.unitCostPrice,
                        lastSupplier = supplierName,
                        lastRestockedAt = now
                    )
                    stockDao.updateStock(updatedStock)

                    stockDao.insertAuditLog(
                        StockAuditLogEntity(
                            stockItemId = existing.id,
                            quantityAdded = reviewItem.quantityToAdd,
                            costPrice = reviewItem.newCostPrice,
                            supplierName = supplierName,
                            invoiceReference = invoiceReference,
                            timestamp = now
                        )
                    )
                    updatedCount++
                } else {
                    // Insert newly scanned stock record
                    val newEntity = StockEntity(
                        itemCode = reviewItem.targetItemCode,
                        description = reviewItem.targetDescription,
                        category = "Uncategorized / Newly Scanned",
                        quantityOnHand = reviewItem.quantityToAdd,
                        unitCostPrice = reviewItem.newCostPrice,
                        sellingPrice = reviewItem.suggestedSellPrice,
                        isNewUnreviewed = true,
                        lastSupplier = supplierName,
                        lastRestockedAt = now
                    )
                    val insertedId = stockDao.insertStock(newEntity)

                    stockDao.insertAuditLog(
                        StockAuditLogEntity(
                            stockItemId = insertedId,
                            quantityAdded = reviewItem.quantityToAdd,
                            costPrice = reviewItem.newCostPrice,
                            supplierName = supplierName,
                            invoiceReference = invoiceReference,
                            timestamp = now
                        )
                    )
                    updatedCount++
                }
            }
            updatedCount
        }
    }

    private fun findBestFuzzyMatch(rawDesc: String, catalog: List<StockEntity>): StockEntity? {
        val cleanDesc = rawDesc.lowercase().replace(Regex("[^a-z0-9 ]"), " ")
        val tokens = cleanDesc.split(" ").filter { it.length > 2 }
        if (tokens.isEmpty()) return null

        var bestMatch: StockEntity? = null
        var maxMatches = 0

        for (item in catalog) {
            val itemDesc = item.description.lowercase()
            val matches = tokens.count { itemDesc.contains(it) }
            if (matches > maxMatches && matches >= 2) {
                maxMatches = matches
                bestMatch = item
            }
        }
        return bestMatch
    }
}
