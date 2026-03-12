<?php

function replaceMigrationContent($file, $content) {
    preg_match('/Schema::create\(\'_{0,1}([a-zA-Z_]+)\', function \(Blueprint \$table\) {/', file_get_contents($file), $matches);
    if (!empty($matches)) {
        $tableName = $matches[1];
        $newSchema = "Schema::create('" . $tableName . "', function (Blueprint \$table) {\n" . $content . "\n        });";
        $fileContent = preg_replace('/Schema::create\(\'_?[a-zA-Z_]+\', function \(Blueprint \$table\) \{.*?\}\);/s', $newSchema, file_get_contents($file));
        file_put_contents($file, $fileContent);
        echo "Updated $tableName\n";
    }
}

replaceMigrationContent("database/migrations/2026_02_26_074846_create_categories_table.php", "            \$table->id();\n            \$table->string('name');\n            \$table->timestamps();");

// we added a `harga_modal_saat_itu` originally but removed it based on user feedback.
replaceMigrationContent("database/migrations/2026_02_26_074846_create_products_table.php", "            \$table->id();\n            \$table->foreignId('category_id')->constrained()->onDelete('restrict');\n            \$table->string('name');\n            \$table->decimal('harga_beli', 15, 2);\n            \$table->decimal('harga_jual', 15, 2);\n            \$table->integer('stok_saat_ini')->default(0);\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074847_create_sales_table.php", "            \$table->id();\n            \$table->dateTime('tanggal');\n            \$table->decimal('total_penjualan', 15, 2);\n            \$table->decimal('total_hpp', 15, 2);\n            \$table->decimal('laba_kotor', 15, 2);\n            \$table->foreignId('user_id')->constrained()->onDelete('restrict');\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074847_create_sale_items_table.php", "            \$table->id();\n            \$table->foreignId('sale_id')->constrained()->onDelete('cascade');\n            \$table->foreignId('product_id')->constrained()->onDelete('restrict');\n            \$table->integer('qty');\n            \$table->decimal('harga_jual_saat_itu', 15, 2);\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074848_create_distributors_table.php", "            \$table->id();\n            \$table->string('name');\n            \$table->string('phone')->nullable();\n            \$table->text('address')->nullable();\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074848_create_purchases_table.php", "            \$table->id();\n            \$table->foreignId('distributor_id')->constrained()->onDelete('restrict');\n            \$table->dateTime('tanggal');\n            \$table->decimal('total_pembelian', 15, 2);\n            \$table->enum('status_pembayaran', ['lunas', 'hutang']);\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074849_create_stock_movements_table.php", "            \$table->id();\n            \$table->foreignId('product_id')->constrained()->onDelete('cascade');\n            \$table->enum('tipe', ['in', 'out', 'adjustment']);\n            \$table->enum('sumber', ['purchase', 'sale', 'opname', 'manual']);\n            \$table->unsignedBigInteger('reference_id')->nullable();\n            \$table->integer('qty');\n            \$table->string('keterangan')->nullable();\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074849_create_stock_opnames_table.php", "            \$table->id();\n            \$table->dateTime('tanggal');\n            \$table->string('keterangan')->nullable();\n            \$table->foreignId('created_by')->constrained('users')->onDelete('restrict');\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074850_create_stock_opname_items_table.php", "            \$table->id();\n            \$table->foreignId('stock_opname_id')->constrained()->onDelete('cascade');\n            \$table->foreignId('product_id')->constrained()->onDelete('restrict');\n            \$table->integer('stok_sistem');\n            \$table->integer('stok_fisik');\n            \$table->integer('selisih');\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074850_create_warranties_table.php", "            \$table->id();\n            \$table->string('customer_name');\n            \$table->string('customer_phone');\n            \$table->string('product_name');\n            \$table->dateTime('tanggal_masuk');\n            \$table->string('status');\n            \$table->text('catatan')->nullable();\n            \$table->foreignId('created_by')->constrained('users')->onDelete('restrict');\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074851_create_warranty_logs_table.php", "            \$table->id();\n            \$table->foreignId('warranty_id')->constrained()->onDelete('cascade');\n            \$table->string('status');\n            \$table->text('catatan')->nullable();\n            \$table->dateTime('tanggal');\n            \$table->foreignId('user_id')->constrained()->onDelete('restrict');\n            \$table->timestamps();");

replaceMigrationContent("database/migrations/2026_02_26_074851_create_cash_flows_table.php", "            \$table->id();\n            \$table->dateTime('tanggal');\n            \$table->enum('tipe', ['masuk', 'keluar']);\n            \$table->enum('sumber', ['shopee', 'lazada', 'tiktok', 'tokopedia', 'offline', 'bayar_distributor', 'biaya_operasional', 'biaya_umum']);\n            \$table->decimal('nominal', 15, 2);\n            \$table->string('keterangan')->nullable();\n            \$table->timestamps();");

// also update the users table 
replaceMigrationContent("database/migrations/0001_01_01_000000_create_users_table.php", "            \$table->id();\n            \$table->string('name');\n            \$table->string('email')->unique();\n            \$table->timestamp('email_verified_at')->nullable();\n            \$table->string('password');\n            \$table->enum('role', ['owner', 'staf'])->default('staf');\n            \$table->rememberToken();\n            \$table->timestamps();");

echo "All migrations updated.\n";
