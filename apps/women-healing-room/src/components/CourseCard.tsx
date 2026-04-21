import Link from "next/link";
import styles from "./CourseCard.module.css";

interface CourseCardProps {
  title: string;
  description: string;
  href: string;
  tag?: string;
  doctorInfo?: string;
}

export default function CourseCard({
  title,
  description,
  href,
  tag = "專屬推薦課程",
  doctorInfo = "👩‍⚕️ 鄧雯心醫師 專業把關。"
}: CourseCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.tag}>{tag}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      <div className={styles.footer}>
        <span className={styles.doctorInfo}>{doctorInfo}</span>
        <Link href={href} className={styles.button}>
          了解課程
        </Link>
      </div>
    </div>
  );
}
