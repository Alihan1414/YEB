import DiabetesDashboard from '@/components/diyabet/DiabetesDashboard';

export const metadata = {
  title: 'TD1 Diyabetim Yanımda - Kan Şekeri, İnsülin & Karbonhidrat Takibi',
  description: 'Tip 1 Diyabet hastaları için kan şekeri ölçümü, bazal ve bolus insülin doz takibi, karbonhidrat sayacı ve acil hipoglisemi rehberi.',
};

export default function DiyabetPage() {
  return <DiabetesDashboard />;
}
