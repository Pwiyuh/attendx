import React from 'react';
import styles from './Card.module.scss';
import classNames from 'classnames';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glow?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className, hoverable, glow }) => (
  <div className={classNames(styles.card, hoverable && styles.hoverable, glow && styles.glow, className)}>
    {children}
  </div>
);

const CardHeader: React.FC<{ title: string; description?: string; children?: React.ReactNode }> = ({ title, description, children }) => (
  <div className={styles.header}>
    <h3 className={styles.title}>{title}</h3>
    {description && <p className={styles.description}>{description}</p>}
    {children}
  </div>
);

const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={classNames(styles.body, className)}>{children}</div>
);

const CardFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={styles.footer}>{children}</div>
);

export { Card, CardHeader, CardBody, CardFooter };
export default Card;
