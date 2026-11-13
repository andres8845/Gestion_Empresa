-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('unidad', 'libra');

-- CreateEnum
CREATE TYPE "movement_type" AS ENUM ('entrada_mercaderia', 'ajuste_manual', 'venta', 'anulacion');

-- CreateEnum
CREATE TYPE "sale_status" AS ENUM ('activa', 'anulada');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('efectivo', 'tarjeta', 'fiado');

-- CreateEnum
CREATE TYPE "credit_payment_method" AS ENUM ('efectivo', 'tarjeta');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('anulacion_venta', 'cambio_precio', 'ajuste_stock', 'eliminacion_fiado');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" "audit_action" NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" INTEGER,
    "details" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "cost" DECIMAL(10,2) DEFAULT 0,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "unit_type" "unit_type" NOT NULL DEFAULT 'unidad',
    "stock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isv_rate" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "requires_age_verification" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parent_product_id" INTEGER,
    "units_per_package" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "movement_type" "movement_type" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "previous_stock" DECIMAL(10,2) NOT NULL,
    "new_stock" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "sale_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(6),
    "initial_amount" DECIMAL(10,2) NOT NULL,
    "expected_amount" DECIMAL(10,2),
    "actual_amount" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "status" "session_status" NOT NULL DEFAULT 'abierta',

    CONSTRAINT "cash_register_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "cash_register_session_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "cash_received" DECIMAL(10,2) DEFAULT 0,
    "change_given" DECIMAL(10,2) DEFAULT 0,
    "status" "sale_status" NOT NULL DEFAULT 'activa',
    "void_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_details" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "isv_rate" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_customers" (
    "id" SERIAL NOT NULL,
    "alias_name" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_credit_at" TIMESTAMP(6),
    "last_movement_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_charges" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_payments" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "cash_register_session_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "credit_payment_method" NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replenishment_suggestions" (
    "id" SERIAL NOT NULL,
    "run_date" DATE NOT NULL,
    "product_id" INTEGER NOT NULL,
    "avg_daily_sales" DECIMAL(10,2) NOT NULL,
    "days_of_stock" DECIMAL(10,2),
    "suggested_quantity" INTEGER NOT NULL,
    "is_slow_mover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "replenishment_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoice_number_key" ON "sales"("invoice_number");

-- CreateIndex
CREATE INDEX "sales_created_at_idx" ON "sales"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_customers_alias_name_key" ON "credit_customers"("alias_name");

-- CreateIndex
CREATE UNIQUE INDEX "replenishment_suggestions_run_date_product_id_key" ON "replenishment_suggestions"("run_date", "product_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_parent_product_id_fkey" FOREIGN KEY ("parent_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_register_session_id_fkey" FOREIGN KEY ("cash_register_session_id") REFERENCES "cash_register_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_charges" ADD CONSTRAINT "credit_charges_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "credit_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_charges" ADD CONSTRAINT "credit_charges_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "credit_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_cash_register_session_id_fkey" FOREIGN KEY ("cash_register_session_id") REFERENCES "cash_register_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_suggestions" ADD CONSTRAINT "replenishment_suggestions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
