export default function getFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; 

  if (month >= 4) {
    const currentYY = year.toString().slice(-2);
    const nextYY = (year + 1).toString().slice(-2);
    return `${currentYY}-${nextYY}`;
  } else {
    const prevYY = (year - 1).toString().slice(-2);
    const currentYY = year.toString().slice(-2);
    return `${prevYY}-${currentYY}`;
  }
}
