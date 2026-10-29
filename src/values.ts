/**
 * Türkiye Yüzyılı Maarif Modeli — Erdem-Değer-Eylem Çerçevesi'ndeki 20 değer.
 * Kaynak: https://tymm.meb.gov.tr/beceriler/erdem-deger-eylem-cercevesi
 */
export type ValueGroup = 'cati' | 'insan' | 'aile' | 'cevre';

export interface ValueDef {
  id: string;
  name: string;
  en: string;
  group: ValueGroup;
}

export const VALUE_GROUPS: Record<ValueGroup, { name: string; en: string }> = {
  cati: { name: 'Çatı değerler', en: 'Core values' },
  insan: { name: 'Kişisel hayat', en: 'Personal life' },
  aile: { name: 'Aile ve sosyal çevre', en: 'Family and community' },
  cevre: { name: 'Yaşanabilir çevre', en: 'A livable world' },
};

export const VALUES: ValueDef[] = [
  { id: 'saygi', name: 'Saygı', en: 'Respect', group: 'cati' },
  { id: 'sorumluluk', name: 'Sorumluluk', en: 'Responsibility', group: 'cati' },
  { id: 'adalet', name: 'Adalet', en: 'Fairness', group: 'cati' },
  { id: 'tasarruf', name: 'Tasarruf', en: 'Thrift', group: 'insan' },
  { id: 'sabir', name: 'Sabır', en: 'Patience', group: 'insan' },
  { id: 'mahremiyet', name: 'Mahremiyet', en: 'Privacy', group: 'insan' },
  { id: 'mutevazilik', name: 'Mütevazılık', en: 'Modesty', group: 'insan' },
  { id: 'saglikli-yasam', name: 'Sağlıklı yaşam', en: 'Healthy living', group: 'insan' },
  { id: 'caliskanlik', name: 'Çalışkanlık', en: 'Hard work', group: 'insan' },
  { id: 'sevgi', name: 'Sevgi', en: 'Love', group: 'aile' },
  { id: 'dostluk', name: 'Dostluk', en: 'Friendship', group: 'aile' },
  { id: 'ozgurluk', name: 'Özgürlük', en: 'Freedom', group: 'aile' },
  { id: 'durustluk', name: 'Dürüstlük', en: 'Honesty', group: 'aile' },
  { id: 'vatanseverlik', name: 'Vatanseverlik', en: 'Love of homeland', group: 'aile' },
  { id: 'yardimseverlik', name: 'Yardımseverlik', en: 'Helpfulness', group: 'aile' },
  { id: 'aile-butunlugu', name: 'Aile bütünlüğü', en: 'Family unity', group: 'aile' },
  { id: 'temizlik', name: 'Temizlik', en: 'Cleanliness', group: 'cevre' },
  { id: 'duyarlilik', name: 'Duyarlılık', en: 'Caring for the world', group: 'cevre' },
  { id: 'estetik', name: 'Estetik', en: 'Beauty', group: 'cevre' },
  { id: 'merhamet', name: 'Merhamet', en: 'Compassion', group: 'cevre' },
];

export function valueById(id: string): ValueDef {
  return VALUES.find((v) => v.id === id) ?? { id, name: id, en: id, group: 'aile' };
}
