UPDATE transactions transaction
JOIN recurring_transaction_generations generation ON generation.transaction_id = transaction.id
JOIN recurring_transaction_templates template ON template.id = generation.template_id
SET
    transaction.amount = template.amount,
    transaction.type = template.type,
    transaction.category_id = template.category_id,
    transaction.payer_id = template.payer_id,
    transaction.memo = template.memo
WHERE transaction.amount <> template.amount
   OR transaction.type <> template.type
   OR COALESCE(transaction.category_id, 0) <> COALESCE(template.category_id, 0)
   OR transaction.payer_id <> template.payer_id
   OR COALESCE(transaction.memo, '') <> COALESCE(template.memo, '');
