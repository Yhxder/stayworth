import {
  BRAND_RULE_REFERENCE_DATE,
  BRAND_RULE_SOURCE_URL,
} from "../../lib/brand-points";
import { CARD_RULE_REFERENCE_DATE } from "../../lib/cards";
import {
  EXCHANGE_RATE_REFERENCE_DATE,
  EXCHANGE_RATE_SOURCE_NAME,
  EXCHANGE_RATE_SOURCE_URL,
} from "../../lib/currencies";

/**
 * Release-readiness disclosures. These statements must stay honest: they only
 * claim what the prototype actually does with user input and price data.
 */
export function TrustAndSources() {
  return (
    <section aria-labelledby="trust-title" className="trust-section">
      <div className="section-heading">
        <div>
          <h2 id="trust-title">数据来源、隐私与独立声明</h2>
        </div>
        <p>三条底线：数据可追溯、输入不外传、与万豪没有隶属关系。</p>
      </div>

      <div className="trust-grid">
        <article>
          <h3>数据来源与时效</h3>
          <ul>
            <li>
              香港和上海的价格是人工维护的有限快照，不是实时库存；每张酒店卡片都会显示来源标签和更新日期。
            </li>
            <li>
              没有完全匹配城市与日期的快照时，页面显示“暂无数据”，不会用其他日期的价格替代。
            </li>
            <li>
              引用日期：品牌积分规则 {BRAND_RULE_REFERENCE_DATE}，信用卡规则{" "}
              {CARD_RULE_REFERENCE_DATE}，参考汇率{" "}
              {EXCHANGE_RATE_REFERENCE_DATE}。
            </li>
            <li>预订或兑换前，请前往万豪官方渠道重新核验价格与可用性。</li>
          </ul>
          <p className="trust-links">
            <a href={BRAND_RULE_SOURCE_URL} rel="noreferrer" target="_blank">
              Marriott 官方积分规则
            </a>
            <a href={EXCHANGE_RATE_SOURCE_URL} rel="noreferrer" target="_blank">
              {EXCHANGE_RATE_SOURCE_NAME}
            </a>
          </p>
        </article>

        <article>
          <h3>隐私</h3>
          <ul>
            <li>不需要注册，也不收集万豪账号、信用卡号或订单信息。</li>
            <li>
              现金价、积分、汇率和会员等级等输入只在你的浏览器内参与计算，不会上传或保存到服务器。
            </li>
            <li>原型不加载第三方统计、广告或跨站跟踪脚本。</li>
            <li>如果未来加入访问统计，会先在这里说明统计范围和用途。</li>
          </ul>
        </article>

        <article>
          <h3>独立项目声明</h3>
          <p>
            StayWorth 是个人学习与作品集项目，与 Marriott International,
            Inc. 及其关联公司没有隶属、赞助或背书关系。
          </p>
          <p>
            Marriott、Marriott Bonvoy
            及相关品牌名称与标识归其各自所有者。本工具只用于估算，不构成预订、兑换、税务或财务建议。
          </p>
        </article>
      </div>
    </section>
  );
}
