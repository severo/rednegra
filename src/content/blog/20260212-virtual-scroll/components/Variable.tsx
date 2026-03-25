import styles from "./Variable.module.css";

import { cn } from "./helpers.ts";

type Prefix = "viewport" | "table" | "canvas" | "full-table";

export default function Variable({
  prefix,
  label,
  value,
}: {
  prefix?: Prefix;
  label: string;
  value: string;
}) {
  return (
    <tr className={styles.row}>
      <td>
        <FormattedPrefix prefix={prefix} />
        {label}
      </td>
      <td>{value}</td>
    </tr>
  );
}

function FormattedPrefix({ prefix }: { prefix?: Prefix }) {
  if (prefix === undefined) {
    return null;
  }
  return (
    <>
      <span className={cn(styles.prefix, styles[prefix])}>{prefix}</span>.
    </>
  );
}
