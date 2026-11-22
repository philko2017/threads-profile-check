import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../web/scorer.js');

// 1. 空白首頁：總分應低於 30 且包含高優先修改建議
const blankReport = S.scoreProfile({
  role: 'creator',
  displayName: '',
  handle: '',
  bio: '',
  linkUrl: '',
  topics: [],
});
assert.ok(blankReport.total < 30, `Blank score expected < 30, got ${blankReport.total}`);
assert.ok(blankReport.suggestions.some((s) => s.priority === 'high'), 'Expected high priority suggestion for blank profile');

// 2. 模糊空泛首頁（無定位、無換行、無連結）：總分應低於 65
const vagueReport = S.scoreProfile({
  role: 'freelancer',
  displayName: 'Alex',
  handle: 'alex',
  bio: '熱愛生活，斜槓青年，什麼都聊，多多指教',
  linkUrl: '',
  topics: [],
});
assert.ok(vagueReport.total < 65, `Vague score expected < 65, got ${vagueReport.total}`);
assert.equal(vagueReport.dimensions.length, 5, 'Should evaluate 5 dimensions');

// 3. 高品質範例（creator 與 shop）應 >= 80 分
const creatorReport = S.scoreProfile(S.SAMPLE_PROFILES.creator);
const shopReport = S.scoreProfile(S.SAMPLE_PROFILES.shop);
assert.ok(creatorReport.total >= 80, `Creator sample expected >= 80, got ${creatorReport.total}`);
assert.ok(shopReport.total >= 80, `Shop sample expected >= 80, got ${shopReport.total}`);

// 4. 超過 30 字顯示名稱與 150 字簡介、非法帳號應觸發紅線警示
const overLimitReport = S.scoreProfile({
  role: 'shop',
  displayName: '這是一個超級超級超級超級超級長一定超過三十個字的商店顯示名稱測試',
  handle: 'invalid handle!!',
  bio: '測試'.repeat(85),
  linkUrl: '',
  topics: [],
});
assert.ok(overLimitReport.metrics.nameLen > S.LIMITS.displayNameMax);
assert.ok(overLimitReport.metrics.bioLen > S.LIMITS.bioMax);
assert.equal(overLimitReport.metrics.handleValid, false);
assert.ok(overLimitReport.warnings.length >= 3, `Expected >= 3 warnings, got ${overLimitReport.warnings.length}`);

// 5. generateLocalRewrites：回傳 3 種版本且皆符合長度限制
const rewrites = S.generateLocalRewrites({
  role: 'shop',
  displayName: '幸福小廚',
  handle: 'happy.kitchen',
  bio: '在新莊賣古早味滷肉飯跟現燙青菜已經七年，每日限量手工熬煮，歡迎大家點連結看菜單跟預訂外帶🍱🔥'.repeat(2),
  linkUrl: 'https://example.com/menu',
  topics: ['新莊美食', '滷肉飯', '在地小店'],
});
assert.equal(rewrites.length, 3, 'Should generate 3 rewrite variants');
for (const rw of rewrites) {
  assert.ok(rw.displayName.length > 0 && rw.displayName.length <= 30, `Rewrite name out of bounds: ${rw.displayName.length}`);
  assert.ok(rw.bio.length > 0 && rw.bio.length <= 150, `Rewrite bio out of bounds: ${rw.bio.length}`);
}

// 6. buildFromWizard：空輸入與完整 3 題輸入皆安全產出 3 版草稿且不超限
const emptyWizard = S.buildFromWizard({});
assert.equal(emptyWizard.length, 3);
emptyWizard.forEach((d) => {
  assert.ok(d.displayName.length <= 30);
  assert.ok(d.bio.length <= 150);
});

const filledWizard = S.buildFromWizard({
  role: 'freelancer',
  displayName: '慢慢洗工作室',
  who: '板橋江子翠的一對一不關籠寵物美容工作室',
  value: '專接膽小或高齡狗狗，全程只服務一隻不讓毛孩緊張',
  action: '點下方連結看價目表與這個月可以預約的時段',
  linkUrl: 'https://line.me/R/ti/p/@demo',
});
assert.equal(filledWizard.length, 3);
filledWizard.forEach((d) => {
  assert.ok(d.displayName.length <= 30);
  assert.ok(d.bio.length <= 150);
});

console.log(
  `ALL TESTS PASSED | blank=${blankReport.total}, vague=${vagueReport.total}, creator=${creatorReport.total}, shop=${shopReport.total}`
);
