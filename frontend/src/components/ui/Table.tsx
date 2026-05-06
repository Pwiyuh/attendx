import React from 'react';
import styles from './Table.module.scss';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  keyField?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string | undefined;
}

function Table<T extends object>({
  columns,
  data,
  emptyMessage = 'No data found',
  keyField = 'id',
  onRowClick,
  rowClassName,
}: TableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>List</div>
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr 
                key={String((item as Record<string, unknown>)[keyField] ?? index)}
                onClick={() => onRowClick?.(item)}
                className={rowClassName?.(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(item, index) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
