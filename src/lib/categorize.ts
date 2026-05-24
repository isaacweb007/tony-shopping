/**
 * Lightweight categoriser for shopping queries.
 *
 * Tony uses this to (1) accumulate user-profile interest signals and
 * (2) pick the right personalised prompt template later.
 *
 * Phase 9+ replaces this with an embedding-based classifier — until then,
 * a multilingual keyword sieve is good enough for prompt steering.
 */

export type Category =
  | 'shoes'
  | 'bag'
  | 'lighting'
  | 'clothes'
  | 'beauty'
  | 'electronics'
  | 'furniture'
  | 'kitchen'
  | 'food'
  | 'sports'
  | 'toy'
  | 'pet'
  | 'jewelry'
  | 'baby';

/** Map: category → array of needle keywords (lowercase). */
const KEYWORDS: Record<Category, string[]> = {
  shoes: ['신발', '운동화', '구두', '스니커즈', '슬리퍼', '부츠', 'sneaker', 'shoe', 'boot', 'heel', 'sandals', 'sneakers', 'giày', 'sneaker'],
  bag: ['가방', '백팩', '클러치', '토트', '핸드백', 'bag', 'backpack', 'tote', 'clutch', 'handbag', 'túi'],
  lighting: ['조명', '램프', '무드등', '스탠드', 'lamp', 'light', 'mood', 'đèn'],
  clothes: ['옷', '셔츠', '티셔츠', '바지', '청바지', '원피스', '코트', '자켓', 'shirt', 'dress', 'pants', 'jeans', 'coat', 'jacket', 'áo', 'quần', 'váy'],
  beauty: ['화장품', '스킨케어', '립스틱', '향수', '파운데이션', 'cosmetic', 'skincare', 'lipstick', 'perfume', 'foundation', 'mỹ phẩm', 'son'],
  electronics: ['전자', '노트북', '핸드폰', '아이폰', '갤럭시', '헤드폰', '이어폰', 'laptop', 'phone', 'iphone', 'galaxy', 'headphone', 'earbud', 'điện thoại', 'tai nghe'],
  furniture: ['가구', '의자', '책상', '소파', '침대', 'furniture', 'chair', 'desk', 'sofa', 'bed', 'ghế', 'bàn'],
  kitchen: ['주방', '냄비', '프라이팬', '식기', 'pan', 'pot', 'kitchen', 'cookware', 'nồi'],
  food: ['식품', '커피', '차', '간식', 'snack', 'coffee', 'tea', 'food', 'cà phê'],
  sports: ['스포츠', '운동', '요가', '러닝', '자전거', 'sport', 'gym', 'yoga', 'running', 'bike', 'thể thao'],
  toy: ['장난감', '레고', '인형', 'toy', 'lego', 'doll', 'đồ chơi'],
  pet: ['반려', '강아지', '고양이', 'pet', 'dog', 'cat', 'thú cưng'],
  jewelry: ['주얼리', '귀걸이', '목걸이', '반지', 'jewelry', 'necklace', 'ring', 'earring', 'trang sức'],
  baby: ['유아', '아기', '아동', 'baby', 'infant', 'kid', 'em bé'],
};

/** Return all categories matched by the query (lowercased, accent-insensitive enough for KR/EN/VI). */
export function categorize(q: string): Category[] {
  const s = q.toLowerCase();
  const hits: Category[] = [];
  (Object.keys(KEYWORDS) as Category[]).forEach((cat) => {
    if (KEYWORDS[cat].some((k) => s.includes(k))) hits.push(cat);
  });
  return hits;
}

/** Bucket a numeric amount (KRW) into low/mid/high. */
export function priceBucket(amount: number): 'low' | 'mid' | 'high' {
  if (amount <= 30000) return 'low';
  if (amount <= 100000) return 'mid';
  return 'high';
}
