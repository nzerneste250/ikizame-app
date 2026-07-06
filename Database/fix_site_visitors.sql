-- Drop and recreate site_visitors with proper unique constraint
DROP TABLE IF EXISTS `site_visitors`;

CREATE TABLE `site_visitors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `visit_date` date NOT NULL,
  `visited_at` datetime NOT NULL,
  `visit_count` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ip_date` (`ip_address`, `visit_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
