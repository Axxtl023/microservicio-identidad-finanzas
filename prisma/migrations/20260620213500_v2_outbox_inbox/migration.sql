-- CreateTable
CREATE TABLE "event_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "exchange" VARCHAR(100) NOT NULL,
    "routing_key" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "correlation_id" UUID,
    "aggregate_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_messages" (
    "event_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_messages_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_outbox_event_id_key" ON "event_outbox"("event_id");

-- CreateIndex
CREATE INDEX "idx_event_outbox_unpublished" ON "event_outbox"("created_at") WHERE published_at IS NULL;

-- CreateIndex
CREATE INDEX "idx_event_outbox_correlation" ON "event_outbox"("correlation_id");

-- CreateIndex
CREATE INDEX "idx_event_outbox_aggregate" ON "event_outbox"("aggregate_id");
