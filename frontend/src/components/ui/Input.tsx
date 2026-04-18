import React from 'react';
import styles from './Input.module.scss';
import classNames from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className, id, ...props }) => (
  <div className={styles.inputWrapper}>
    {label && <label className={styles.label} htmlFor={id}>{label}</label>}
    <input
      id={id}
      className={classNames(styles.input, error && styles.error, className)}
      {...props}
    />
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
);

export { Input };
export default Input;
