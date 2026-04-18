import React from 'react';
import styles from './Select.module.scss';
import classNames from 'classnames';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string | number; label: string }[];
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({ 
  label, 
  error, 
  options, 
  placeholder, 
  className, 
  id, 
  children,
  ...props 
}) => {
  return (
    <div className={styles.selectWrapper}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <div className={styles.relative}>
        <select
          id={id}
          className={classNames(styles.select, error && styles.error, className)}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options ? (
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        <div className={styles.arrow} />
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default Select;
