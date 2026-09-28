-- 卡片上的来源标签会被真实用户读到，不能留「prototype fixture」这种工程内部措辞。
-- 这些行本来就是人工维护的示例快照，改成如实描述，日期口径不变。
UPDATE `price_snapshots`
SET `source_name` = '示例价格快照（人工维护）'
WHERE `source_name` = 'StayWorth prototype fixture';
