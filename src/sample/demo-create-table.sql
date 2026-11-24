CREATE TABLE employees (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key of employee',
    employee_code VARCHAR(20) NOT NULL COMMENT 'Unique employee code',
    full_name VARCHAR(150) NOT NULL COMMENT 'Full name of employee',
    email VARCHAR(150) NOT NULL COMMENT 'Employee email address',
    age INT DEFAULT NULL COMMENT 'Employee age',
    salary DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Monthly salary',
    gender ENUM('MALE', 'FEMALE', 'OTHER') DEFAULT 'OTHER' COMMENT 'Employee gender',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Employee active status',
    department_id BIGINT DEFAULT NULL COMMENT 'Reference to department',
    metadata JSON DEFAULT NULL COMMENT 'Additional employee information',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',

    CONSTRAINT pk_employees PRIMARY KEY (id),
    CONSTRAINT uk_employees_code UNIQUE (employee_code),
    CONSTRAINT uk_employees_email UNIQUE (email),
    CONSTRAINT fk_employees_department
        FOREIGN KEY (department_id) REFERENCES departments(id),

    INDEX idx_employees_full_name (full_name),
    INDEX idx_employees_salary (salary),
    INDEX idx_employees_department_status (department_id, is_active),
    FULLTEXT INDEX ft_employees_name (full_name)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Table storing employee information';