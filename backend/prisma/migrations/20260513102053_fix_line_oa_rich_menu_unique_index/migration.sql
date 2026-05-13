-- DropIndex
DROP INDEX "idx_rich_menu_templates_oa";

-- CreateIndex
CREATE INDEX "idx_rich_menu_templates_oa" ON "line_oa_rich_menu_template"("oa_id");
