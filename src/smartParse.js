// 从商家发来的整段文字里识别台账字段
// 返回 { fields: {...}, matched: ['本金','佣金',...] }

const PLATFORM_RULES = [
  [/小红书|红薯|xhs/i, '小红书'],
  [/微信|v信|vx|wx/i, 'vx'],
  [/(?:^|[^a-z])qq/i, 'qq'],
  [/淘宝|(?:^|[^a-z])tb(?![a-z])/i, '淘宝'],
  [/拼多多|pdd/i, '拼多多'],
  [/抖音|(?:^|[^a-z])dy(?![a-z])/i, '抖音']
]

const NUM = '(\\d+(?:\\.\\d{1,2})?)'

function matchNum(text, re) {
  const m = text.match(re)
  return m ? Number(m[1]) : null
}

export function parseRecord(raw) {
  const text = (raw || '').trim()
  const fields = {}
  const matched = []
  if (!text) return { fields, matched }

  // 本金:本金/垫付/实付/拍下/付款 + 金额
  const cost = matchNum(text, new RegExp(`(?:本金|垫付|需垫|实付|拍下价?|付款|下单价?|先拍)[^\\d¥￥]{0,4}[¥￥]?${NUM}`))
  if (cost != null) { fields.cost = cost; matched.push('本金') }

  // 佣金:先按明确关键词,再退回"返/反 + 数字"
  let commission = matchNum(text, new RegExp(`(?:佣金|返佣|返现|反现|做完[返反])[^\\d¥￥]{0,4}[¥￥]?${NUM}`))
  if (commission == null) commission = matchNum(text, new RegExp(`[返反]\\s*[¥￥]?${NUM}`))
  if (commission != null) { fields.commission = commission; matched.push('佣金') }

  const deposit = matchNum(text, new RegExp(`押金[^\\d¥￥]{0,4}[¥￥]?${NUM}`))
  if (deposit != null) { fields.deposit = deposit; matched.push('押金') }

  // 赠品:送xx/赠xx,注意别把"送拍/赠拍"当赠品
  const gift = text.match(/(?:赠品|赠送|送|赠)[:：]?\s*(?![拍寄])([^\s\d,，。;；!！、()（）\n]{1,12})/)
  if (gift) { fields.gift = gift[1]; matched.push('赠品') }

  // 类型
  if (/寄拍/.test(text)) { fields.taskType = '寄拍'; matched.push('类型') }
  else if (/送拍|赠拍/.test(text)) { fields.taskType = '送拍'; matched.push('类型') }
  else if (/帮做|代做/.test(text)) { fields.taskType = '帮做'; matched.push('类型') }

  // 渠道
  for (const [re, name] of PLATFORM_RULES) {
    if (re.test(text)) { fields.platform = name; matched.push('渠道'); break }
  }

  // 账号
  if (/大号/.test(text)) { fields.account = '大号'; matched.push('账号') }
  else if (/小号/.test(text)) { fields.account = '小号'; matched.push('账号') }

  // 日期:2026-07-07 / 2026年7月7日 / 7月7日 / 7.7号(需带"月/日/号"或完整年份,避免误吞金额)
  let recordDate = null
  let dm = text.match(/(\d{4})[.\-/年](\d{1,2})[.\-/月](\d{1,2})/)
  if (dm) recordDate = `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`
  else {
    dm = text.match(/(\d{1,2})[.月](\d{1,2})\s*[日号]/)
    if (dm) recordDate = `${new Date().getFullYear()}-${dm[1].padStart(2, '0')}-${dm[2].padStart(2, '0')}`
  }
  if (recordDate) { fields.recordDate = recordDate; matched.push('日期') }

  // 出图要求:含"张/平铺/上身/视频/买家秀/返图"等的片段
  const reqParts = []
  const reqRe = /[^,，。;；!！\s\n]*(?:\d+张|平铺|上身|试穿|挂拍|买家秀|返图|出图|实拍|视频)[^,，。;；!！\s\n]*/g
  let rm
  while ((rm = reqRe.exec(text)) !== null) {
    const seg = rm[0].trim()
    if (seg && !reqParts.includes(seg)) reqParts.push(seg)
    if (reqParts.length >= 4) break
  }
  if (reqParts.length) { fields.requirement = reqParts.join(' + ').slice(0, 100); matched.push('出图要求') }

  // 状态类开关
  if (/本金已返|已返本金|已回本/.test(text)) { fields.costBack = 1; matched.push('本金已返') }
  if (/佣金已[返发到]|已兑现/.test(text)) { fields.settled = 1; matched.push('已兑现') }

  // 商品名:优先"商品:xx",否则取第一个不含数字金额的短片段
  const nameM = text.match(/(?:商品|品名|产品|宝贝|名称)[:：]?\s*([^\s,，。;；\n]{1,20})/)
  if (nameM) {
    fields.itemName = nameM[1]
    matched.push('商品名')
  } else {
    const segs = text.split(/[,，。;；!！\n\s]+/).filter(Boolean)
    for (const s of segs) {
      const clean = s.replace(/[【】\[\]()（）]/g, '')
        .replace(/寄拍|送拍|赠拍|帮做|代做|急|来一?个|来个?|找|需要?/g, '')
      if (clean && clean.length <= 15 && !/[\d¥￥]/.test(clean) &&
          !/平铺|上身|视频|返图|买家秀|微信|小红书|淘宝|抖音|拼多多|大号|小号|已返|已完成/.test(clean)) {
        fields.itemName = clean
        matched.push('商品名')
        break
      }
    }
  }

  return { fields, matched }
}
