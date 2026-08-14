package za.co.harrysaircon.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface StockDao {
    @Query("SELECT * FROM stock_items ORDER BY description ASC")
    fun getAllStockFlow(): Flow<List<StockEntity>>

    @Query("SELECT * FROM stock_items")
    suspend fun getAllStock(): List<StockEntity>

    @Query("SELECT * FROM stock_items WHERE item_code = :code LIMIT 1")
    suspend fun findByItemCode(code: String): StockEntity?

    @Query("SELECT * FROM stock_items WHERE LOWER(item_code) = LOWER(:code) OR LOWER(description) LIKE '%' || LOWER(:keyword) || '%' LIMIT 1")
    suspend fun findMatchingItem(code: String, keyword: String): StockEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStock(stock: StockEntity): Long

    @Update
    suspend fun updateStock(stock: StockEntity)

    @Insert
    suspend fun insertAuditLog(log: StockAuditLogEntity): Long
}

@Database(
    entities = [StockEntity::class, StockAuditLogEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun stockDao(): StockDao
}
