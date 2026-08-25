UPDATE `price_snapshots`
SET `source_name` = '用户提供的价格样例（日期为原型）'
WHERE `id` = 2
  AND `hotel_id` = 1
  AND `check_in` = '2026-08-15'
  AND `check_out` = '2026-08-16';
