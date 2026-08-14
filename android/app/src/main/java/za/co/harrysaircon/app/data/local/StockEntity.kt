package za.co.harrysaircon.app.data.local

import androidx.room.*

@Entity(tableName = "stock_items")
data class StockEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    @ColumnInfo(name = "item_code")
    val itemCode: String,
    val description: String,
    val category: String = "Uncategorized",
    @ColumnInfo(name = "quantity_on_hand")
    val quantityOnHand: Double = 0.0,
    @ColumnInfo(name = "unit_cost_price")
    val unitCostPrice: Double = 0.0,
    @ColumnInfo(name = "selling_price")
    val sellingPrice: Double = 0.0,
    val unit: String = "pcs",
    @ColumnInfo(name = "is_new_unreviewed")
    val isNewUnreviewed: Boolean = false,
    @ColumnInfo(name = "last_supplier")
    val lastSupplier: String? = null,
    @ColumnInfo(name = "last_restocked_at")
    val lastRestockedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "stock_audit_logs",
    foreignKeys = [
        ForeignKey(
            entity = StockEntity::class,
            parentColumns = ["id"],
            childColumns = ["stock_item_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["stock_item_id"])]
)
data class StockAuditLogEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    @ColumnInfo(name = "stock_item_id")
    val stockItemId: Long,
    @ColumnInfo(name = "quantity_added")
    val quantityAdded: Double,
    @ColumnInfo(name = "cost_price")
    val costPrice: Double,
    @ColumnInfo(name = "supplier_name")
    val supplierName: String,
    @ColumnInfo(name = "invoice_reference")
    val invoiceReference: String,
    @ColumnInfo(name = "timestamp")
    val timestamp: Long = System.currentTimeMillis()
)
