import styles from "./Variables.module.css";

export default function Variables({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.variables}>
      <table>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}
