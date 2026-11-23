<template>
  <!-- 登录页 -->
  <div v-if="!logged" class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <span class="brand-mark">拍</span>
        <div class="login-brand-text">
          <h1>记拍</h1>
          <p>拍单记账 · 一笔不漏</p>
        </div>
      </div>

      <div v-if="mode === 'login'" class="login-tabs">
        <span :class="{ active: loginType === 'code' }" @click="loginType = 'code'">验证码登录</span>
        <span :class="{ active: loginType === 'password' }" @click="loginType = 'password'">密码登录</span>
      </div>
      <div v-else class="login-tabs">
        <span class="active">{{ mode === 'register' ? '注册新账号' : '重置密码' }}</span>
      </div>

      <el-input v-model.trim="loginForm.phone" placeholder="手机号" maxlength="11" size="large"
        class="login-input" inputmode="numeric" @input="onPhoneInput" />
      <div v-if="phoneError" class="field-tip err">{{ phoneError }}</div>

      <div v-if="mode !== 'login' || loginType === 'code'" class="code-row">
        <el-input v-model.trim="loginForm.code" placeholder="6位验证码" maxlength="6" size="large"
          inputmode="numeric" @keyup.enter="onPrimaryAction" />
        <el-button size="large" :disabled="countdown > 0 || !phoneValid" :loading="sending" @click="sendCode">
          {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
        </el-button>
      </div>

      <el-input v-if="mode !== 'login' || loginType === 'password'" v-model="loginForm.password"
        type="password" show-password
        :placeholder="mode === 'login' ? '密码' : (mode === 'reset' ? '新密码(6~20位,含字母和数字)' : '设置密码(6~20位,含字母和数字)')"
        size="large" class="login-input" maxlength="20" @keyup.enter="onPrimaryAction" />
      <div v-if="mode !== 'login' && passwordError" class="field-tip err">{{ passwordError }}</div>

      <el-input v-if="mode !== 'login'" v-model="loginForm.confirm"
        type="password" show-password placeholder="再次输入密码" size="large" class="login-input"
        maxlength="20" @keyup.enter="onPrimaryAction" />
      <div v-if="mode !== 'login' && confirmError" class="field-tip err">{{ confirmError }}</div>

      <div v-if="mode === 'login' && loginType === 'password'" class="login-forgot">
        <a @click="switchMode('reset')">忘记密码?</a>
      </div>

      <el-button v-if="mode === 'login'" type="primary" size="large" class="login-btn"
        :loading="loggingIn" @click="doLogin">登 录</el-button>
      <el-button v-else-if="mode === 'register'" type="primary" size="large" class="login-btn"
        :loading="loggingIn" @click="doRegister">注 册</el-button>
      <el-button v-else type="primary" size="large" class="login-btn"
        :loading="loggingIn" @click="doReset">重置密码</el-button>

      <div class="login-switch">
        <template v-if="mode === 'login'">还没有账号?<a @click="switchMode('register')">立即注册</a></template>
        <template v-else-if="mode === 'register'">已有账号?<a @click="switchMode('login')">去登录</a></template>
        <template v-else>想起来了?<a @click="switchMode('login')">去登录</a></template>
      </div>
    </div>
  </div>

  <!-- 主应用 -->
  <div v-else class="page has-tabbar">
    <!-- 首页/我的 用 v-show 切换:保持挂载,切回首页不再重建筛选、列表和图片,避免卡顿 -->
    <div v-show="activeTab === 'home'">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">拍</span>
        <div>
          <h1>记拍</h1>
        </div>
      </div>
      <div class="topbar-ops">
        <el-button v-if="!isAdmin" size="large" @click="openAiEdit()">AI修图</el-button>
        <el-button v-if="!isAdmin" type="primary" size="large" @click="openDialog()">记一笔</el-button>
      </div>
    </header>

    <!-- 统计卡片(默认收起;超级管理员不展示) -->
    <div v-if="!isAdmin" class="stats-toggle" @click="statsOpen = !statsOpen">
      <span>统计数据</span>
      <span class="stats-toggle-arrow">{{ statsOpen ? '收起 ▲' : '展开 ▼' }}</span>
    </div>
    <div v-if="!isAdmin" class="collapsible" :class="{ open: statsOpen }">
    <div class="collapsible-inner">
    <section class="stats">
      <div class="stat-card">
        <span class="stat-label">总单数</span>
        <span class="stat-value">{{ stats.totalCount ?? '-' }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">累计垫付本金</span>
        <span class="stat-value">¥{{ fmt(stats.totalCost) }}</span>
      </div>
      <div class="stat-card warn clickable" @click="filterByStat({ costBack: 0 })">
        <span class="stat-label">未返本金</span>
        <span class="stat-value">¥{{ fmt(stats.pendingCost) }}</span>
        <span class="stat-sub">{{ stats.pendingCount ?? 0 }} 笔待返</span>
      </div>
      <div class="stat-card clickable" @click="filterByStat({ commissionBack: 1 })">
        <span class="stat-label">累计佣金</span>
        <span class="stat-value">¥{{ fmt(stats.totalCommission) }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">已返本金</span>
        <span class="stat-value">¥{{ fmt(stats.returnedCost) }}</span>
        <span class="stat-sub">{{ stats.returnedCount ?? 0 }} 笔已返</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">快递费</span>
        <span class="stat-value">¥{{ fmt(stats.totalExpressFee) }}</span>
      </div>
    </section>
    </div>
    </div>

    <!-- 筛选(默认收起,可展开/关闭) -->
    <div class="stats-toggle filters-toggle" @click="filtersOpen = !filtersOpen">
      <span>筛选条件</span>
      <span class="stats-toggle-arrow">{{ filtersOpen ? '收起 ▲' : '展开 ▼' }}</span>
    </div>
    <div class="collapsible" :class="{ open: filtersOpen }">
    <div class="collapsible-inner">
    <section class="filters">
      <!-- 月份筛选 -->
      <el-date-picker
          v-model="queryMonth"
          type="month"
          placeholder="选择月份"
          value-format="YYYY-MM"
          clearable
          class="filter-item"
      />
      <el-input v-model="query.itemName" placeholder="商品名称搜索" clearable class="filter-item" />
      <el-select v-model="query.taskType" placeholder="类型" clearable class="filter-item">
        <el-option v-for="t in taskTypes" :key="t" :label="t" :value="t" />
      </el-select>
      <el-select v-model="query.status" placeholder="状态" clearable class="filter-item">
        <el-option v-for="s in statuses" :key="s" :label="s" :value="s" />
      </el-select>
      <el-select v-model="query.costBack" placeholder="本金" clearable class="filter-item">
        <el-option label="已返" :value="1" />
        <el-option label="未返" :value="0" />
      </el-select>
      <el-select v-model="query.received" placeholder="签收" clearable class="filter-item">
        <el-option label="已签收" :value="1" />
        <el-option label="未签收" :value="0" />
      </el-select>
      <el-select v-model="query.shot" placeholder="拍摄" clearable class="filter-item">
        <el-option label="已拍" :value="1" />
        <el-option label="未拍" :value="0" />
      </el-select>
      <div class="filter-btns">
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </section>
    </div>
    </div>

    <!-- 手机:卡片列表 -->
    <div v-if="isMobile" class="card-list" v-loading="loading">
      <div v-for="row in rows" :key="row.id" class="rec-card" @click="openDetail(row)">
        <div class="rec-head">
          <span class="rec-name">{{ row.itemName }}</span>
          <el-tag :type="statusColor(row.status)" size="small">{{ row.status }}</el-tag>
        </div>
        <div v-if="isAdmin" class="rec-owner">用户名:{{ row.ownerPhone || '-' }}</div>
        <div class="rec-money">
          <span class="rec-cost">{{ row.cost != null ? '¥' + row.cost : '-' }}</span>
          <el-tag :type="row.costBack === 1 ? 'success' : 'danger'" size="small" effect="light">
            {{ row.costBack === 1 ? '本金已返' : '本金未返' }}
          </el-tag>
          <el-tag :type="row.received === 1 ? 'success' : 'info'" size="small" effect="plain">
            {{ row.received === 1 ? '已签收' : '未签收' }}
          </el-tag>
          <el-tag :type="row.shot === 1 ? 'success' : 'info'" size="small" effect="plain">
            {{ row.shot === 1 ? '已拍' : '未拍' }}
          </el-tag>
          <span v-if="row.commission != null" class="rec-extra">佣金¥{{ row.commission }}</span>
          <el-tag v-if="row.taskType === '寄拍' && row.commission != null"
            :type="row.commissionBack === 1 ? 'success' : 'danger'" size="small" effect="light">
            {{ row.commissionBack === 1 ? '佣金已返' : '佣金未返' }}
          </el-tag>
          <span v-else-if="row.gift" class="rec-extra">送{{ row.gift }}</span>
          <span v-if="row.expressFee != null" class="rec-extra">快递{{ row.expressFeeType || '' }}¥{{ row.expressFee }}</span>
        </div>
        <div class="rec-meta">
          {{ row.recordDate }} · {{ row.taskType }}<template v-if="row.platform"> · {{ row.platform }}</template><template v-if="row.account"> · {{ row.account }}</template>
        </div>
        <div v-if="row.requirement || row.remark || row.expressCompany || row.expressNo" class="rec-note">
          <span v-if="row.requirement">出图:{{ row.requirement }}</span>
          <span v-if="row.remark">备注:{{ row.remark }}</span>
          <span v-if="row.expressCompany || row.expressNo">寄回:{{ row.expressCompany }} {{ row.expressNo }}</span>
        </div>
        <div class="rec-foot">
          <div v-if="imgList(row).length" class="rec-images">
            <!-- decoding=async:iPhone Safari 不再等大图解码完才画整页,先出内容、图随后补上 -->
            <el-image v-for="(url, index) in imgList(row)" :key="url + index" :src="displaySrc(url)"
              fit="cover" class="rec-img" decoding="async" @click.stop="onRecordImagePreview(row, index)" />
          </div>
          <span v-else></span>
          <div v-if="!isAdmin" class="rec-ops" @click.stop>
            <el-button type="primary" size="small" plain @click="openDialog(row)">编辑</el-button>
            <el-popconfirm v-if="row.status === '已完成'" title="确定删除这条记录吗?" @confirm="remove(row.id)">
              <template #reference>
                <el-button type="danger" size="small" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>
      <el-empty v-if="!rows.length && !loading" description="暂无记录" />
    </div>

    <!-- 电脑:表格 -->
    <el-table v-else :data="rows" v-loading="loading" stripe class="ledger" size="default"
      @row-click="openDetail">
      <el-table-column v-if="isAdmin" prop="ownerPhone" label="用户名" width="120" fixed="left"
        align="center" show-overflow-tooltip />
      <el-table-column prop="recordDate" label="日期" width="105"/>
      <el-table-column prop="itemName" label="商品名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="platform" label="接单平台" min-width="130" align="center" show-overflow-tooltip />
      <el-table-column prop="account" label="下单平台" width="130" align="center" />
      <el-table-column label="状态" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="statusColor(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="图片" width="190">
        <template #default="{ row }">
          <div v-if="imgList(row).length" class="table-images">
            <el-image v-for="(url, index) in imgList(row)" :key="url + index" :src="displaySrc(url)"
              fit="cover" class="table-img" decoding="async" @click.stop="onRecordImagePreview(row, index)" />
          </div>
          <span v-else class="dim">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="requirement" label="出图要求" min-width="140" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" min-width="120" />
      <el-table-column label="本金" width="90" align="right">
        <template #default="{ row }">{{ row.cost != null ? '¥' + row.cost : '-' }}</template>
      </el-table-column>
      <el-table-column label="本金返" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.costBack === 1 ? 'success' : 'danger'" size="small" effect="light">
            {{ row.costBack === 1 ? '已返' : '未返' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="taskType" label="类型" width="70" align="center" />
      <el-table-column label="佣金/赠品" width="110">
        <template #default="{ row }">
          <span v-if="row.commission != null">¥{{ row.commission }}</span>
          <span v-else-if="row.gift">送{{ row.gift }}</span>
          <span v-else class="dim">-</span>
        </template>
      </el-table-column>
      <el-table-column label="佣金返" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.taskType === '寄拍' && row.commission != null"
            :type="row.commissionBack === 1 ? 'success' : 'danger'" size="small" effect="light">
            {{ row.commissionBack === 1 ? '已返' : '未返' }}
          </el-tag>
          <span v-else class="dim">-</span>
        </template>
      </el-table-column>
      <el-table-column label="兑现" width="70" align="center">
        <template #default="{ row }">
          <el-tag :type="row.settled === 1 ? 'success' : 'info'" size="small" effect="plain">
            {{ row.settled === 1 ? '✓' : '待' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="签收" width="70" align="center">
        <template #default="{ row }">
          <el-tag :type="row.received === 1 ? 'success' : 'info'" size="small" effect="plain">
            {{ row.received === 1 ? '✓' : '待' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="拍摄" width="70" align="center">
        <template #default="{ row }">
          <el-tag :type="row.shot === 1 ? 'success' : 'info'" size="small" effect="plain">
            {{ row.shot === 1 ? '已拍' : '未拍' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="快递费类型" width="95" align="center">
        <template #default="{ row }">
          <span v-if="row.expressFeeType">{{ row.expressFeeType }}</span>
          <span v-else class="dim">-</span>
        </template>
      </el-table-column>
      <el-table-column label="快递费" width="85" align="right">
        <template #default="{ row }">
          <span v-if="row.expressFee != null">¥{{ row.expressFee }}</span>
          <span v-else class="dim">-</span>
        </template>
      </el-table-column>
      <el-table-column label="寄回快递" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.expressCompany || row.expressNo">{{ row.expressCompany }} {{ row.expressNo }}</span>
          <span v-else class="dim">-</span>
        </template>
      </el-table-column>
      <el-table-column v-if="!isAdmin" label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <span @click.stop>
            <el-button type="primary" size="small" plain @click="openDialog(row)">编辑</el-button>
            <el-popconfirm v-if="row.status === '已完成'" title="确定删除这条记录吗?" @confirm="remove(row.id)">
              <template #reference>
                <el-button type="danger" size="small" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination class="pager" background
      :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next'"
      :pager-count="isMobile ? 5 : 7"
      :total="total" v-model:current-page="query.current" v-model:page-size="query.size"
      :page-sizes="[10, 20, 50]" @change="onPageChange" />
    </div>

    <!-- 我的 -->
    <div v-show="activeTab === 'mine'" class="mine">
      <div class="mine-card mine-head">
        <!-- 已设置头像:点击查看(在查看弹窗里更换/保存);未设置:点击直接上传 -->
        <div v-if="user.avatar" class="avatar-wrap" @click="avatarView = true">
          <img :src="displaySrc(user.avatar)" class="avatar-img" alt="头像" />
        </div>
        <el-upload v-else class="avatar-upload" action="/api/file/upload" :headers="uploadHeaders"
          :show-file-list="false" :before-upload="beforeImageUpload"
          :on-success="onAvatarOk" :on-error="onAvatarErr" accept="image/*">
          <div class="avatar-wrap">
            <span class="brand-mark">拍</span>
            <span class="avatar-edit">上传头像</span>
          </div>
        </el-upload>
        <div>
          <div class="mine-name">
            {{ user.nickname || '未设置用户名' }}
            <svg class="name-edit-ico" viewBox="0 0 1024 1024" width="15" height="15"
              fill="currentColor" @click="editNickname">
              <path d="M733.9 148.3c8.7 0 16.8 3.3 22.8 9.4l64.2 64.2c6 6 9.4 14.1 9.4 22.8 0 8.7-3.3 16.8-9.4 22.8l-55.6 55.6-109.9-109.8 55.6-55.6c6.1-6 14.2-9.4 22.9-9.4m0-50c-21.1 0-42.2 8-58.2 24l-90.9 90.9 180.6 180.6 90.9-90.9c32-32 32-84.4 0-116.4L792 122.4c-16-16.1-37-24.1-58.1-24.1z" />
              <path d="M620.9 248.1l110.3 110.3-288.8 288.9L272.5 706l59.4-168.9 289-289m0-70.7L288.5 509.8 191 787.1l278.6-96.3 332.3-332.3-181-181.1z" />
              <path d="M191.8 875.6h688.5v50H191.8z" />
            </svg>
          </div>
          <div class="mine-phone">{{ user.phone }}</div>
        </div>
      </div>
      <!-- 功能入口:图标在上、名称在下 -->
      <div class="mine-card">
        <div class="mine-title">功能</div>
        <div class="action-grid">
          <div class="action-tile" @click="openFeedback">
            <div class="tile-ico">
              <svg viewBox="0 0 1024 1024" width="26" height="26" fill="currentColor">
                <path d="M873.6 275.2c-16 0-25.6 12.8-25.6 25.6l0 550.4c0 28.8-22.4 51.2-51.2 51.2l-643.2 0c-28.8 0-51.2-22.4-51.2-51.2l0-646.4c0-28.8 22.4-51.2 51.2-51.2l521.6 0c16 0 25.6-12.8 25.6-25.6 0-12.8-12.8-25.6-25.6-25.6l-521.6 0c-57.6 0-105.6 48-105.6 102.4l0 646.4c0 57.6 48 102.4 105.6 102.4l643.2 0c57.6 0 105.6-44.8 105.6-102.4l0-550.4C899.2 284.8 889.6 275.2 873.6 275.2z" />
                <path d="M483.2 361.6l-278.4 0c-16 0-25.6 12.8-25.6 25.6 0 12.8 12.8 25.6 25.6 25.6l278.4 0c16 0 25.6-12.8 25.6-25.6C508.8 371.2 496 361.6 483.2 361.6z" />
                <path d="M179.2 566.4c0 12.8 12.8 25.6 25.6 25.6l460.8 0c16 0 25.6-12.8 25.6-25.6 0-12.8-12.8-25.6-25.6-25.6l-460.8 0C192 540.8 179.2 553.6 179.2 566.4z" />
                <path d="M969.6 57.6c-9.6-9.6-25.6-9.6-38.4 0l-326.4 323.2c-9.6 9.6-9.6 25.6 0 35.2s25.6 9.6 38.4 0l326.4-323.2C979.2 83.2 979.2 67.2 969.6 57.6z" />
              </svg>
            </div>
            <span>意见反馈</span>
          </div>
          <!-- 记一笔里那些下拉选项(接单平台/下单平台/接单账号/下单账号)都在这儿维护 -->
          <div class="action-tile" @click="openDict">
            <div class="tile-ico">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round">
                <circle cx="5" cy="6" r="1.5" />
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="5" cy="18" r="1.5" />
                <path d="M10 6h10M10 12h10M10 18h10" />
              </svg>
            </div>
            <span>字典管理</span>
          </div>
          <template v-if="user.role === 'admin'">
            <div class="action-tile" @click="openAdmin">
              <div class="tile-ico">
                <svg viewBox="0 0 1024 1024" width="26" height="26" fill="currentColor">
                  <path d="M353.28 535.893333a213.333333 213.333333 0 1 0-213.333333-213.333333 213.333333 213.333333 0 0 0 213.333333 213.333333z m0-372.053333a157.866667 157.866667 0 1 1-155.306667 157.44 156.586667 156.586667 0 0 1 155.306667-157.44z m454.4 377.6a153.173333 153.173333 0 1 0-103.68 5.546667 235.52 235.52 0 0 0-122.88 85.333333A331.52 331.52 0 0 0 21.333333 872.96v44.373333H682.666667v-26.88-17.493333a341.333333 341.333333 0 0 0-5.12-59.306667h321.706666v-27.306666a111.786667 111.786667 0 0 0 0-11.946667 236.8 236.8 0 0 0-191.573333-232.96z m-156.586667-142.933333a97.28 97.28 0 1 1 97.28 98.133333 98.133333 98.133333 0 0 1-97.28-98.133333zM77.653333 860.16a275.626667 275.626667 0 0 1 550.4 0z m585.813334-103.68a334.506667 334.506667 0 0 0-42.666667-81.493333 178.346667 178.346667 0 0 1 325.973333 81.493333z" />
                </svg>
              </div>
              <span>用户管理</span>
            </div>
            <div class="action-tile" @click="openAdminFeedback">
              <div class="tile-ico">
                <el-badge :value="feedbackUnread" :max="99" :hidden="!feedbackUnread">
                  <svg viewBox="0 0 1024 1024" width="26" height="26" fill="currentColor">
                    <path d="M1003.904 844.864h-19.584a23.616 23.616 0 0 0-21.12 15.52l-11.2 27.296a23.36 23.36 0 0 0 3.808 25.888l13.888 13.824a16.32 16.32 0 0 1 0 23.072l-23.104 23.04a16.32 16.32 0 0 1-23.04 0l-13.792-13.856a23.328 23.328 0 0 0-25.888-3.776l-27.296 11.232a23.552 23.552 0 0 0-15.552 21.088v19.488c0 8.992-7.36 16.32-16.32 16.32h-32.544a16.384 16.384 0 0 1-16.352-16.32v-19.488a23.456 23.456 0 0 0-15.552-21.088l-27.296-11.232a23.2 23.2 0 0 0-25.824 3.776l-13.92 13.856a16.32 16.32 0 0 1-23.04 0l-23.072-23.04a16.384 16.384 0 0 1 0-23.072l13.856-13.824a23.424 23.424 0 0 0 3.84-25.888l-11.264-27.296a23.648 23.648 0 0 0-21.12-15.552h-19.52a16.352 16.352 0 0 1-16.32-16.32v-32.576c0-8.96 7.36-16.288 16.32-16.288l19.52 0.032c8.96 0 18.464-7.008 21.12-15.552l11.232-27.328a23.264 23.264 0 0 0-3.84-25.888l-13.824-13.824a16.352 16.352 0 0 1 0-23.104l23.04-23.008a16.32 16.32 0 0 1 23.04 0l13.92 13.824a23.328 23.328 0 0 0 25.888 3.84l27.232-11.232a23.52 23.52 0 0 0 15.552-21.12v-19.552c0-8.96 7.36-16.32 16.352-16.32h32.544c8.96 0 16.32 7.36 16.32 16.32v19.552c0 8.96 7.008 18.496 15.552 21.12l27.264 11.2a23.36 23.36 0 0 0 25.888-3.84l13.888-13.856a16.384 16.384 0 0 1 23.04 0l23.072 23.04a16.352 16.352 0 0 1 0 23.104l-13.888 13.824a23.36 23.36 0 0 0-3.808 25.888l11.2 27.296a23.68 23.68 0 0 0 21.152 15.552h19.552a16.32 16.32 0 0 1 16.256 16.352v32.608a16.32 16.32 0 0 1-16.256 16.288z m-195.488-114.144a81.472 81.472 0 1 0 0 162.944 81.472 81.472 0 0 0 0-162.944zM928 352v128c0 21.664-10.336 32-32 32s-32-10.336-32-32v-128c0-21.664 10.336-32 32-32s32 10.336 32 32z m80.64-281.28L619.616 452.64a38.976 38.976 0 0 1-27.552 11.36c-10.112 0-20-3.776-27.776-11.552a38.976 38.976 0 0 1-0.224-55.136l0.224-0.224L953.312 15.36a38.976 38.976 0 0 1 55.104-0.192l0.224 0.192c15.264 15.168 15.36 39.872 0.192 55.136l-0.192 0.224zM640 160H128c-36.128 0-64 29.76-64 64v672c0 32.064 29.024 64 64 64h352c21.664 0 32 10.336 32 32s-12.832 32-34.496 32H117.408A117.44 117.44 0 0 1 0 906.592V197.376C0 132.576 63.2 96 128 96h512c21.664 0 32 10.336 32 32 0 21.312-10.304 30.144-32 32zM224 448c-21.664 0-32-13.664-32-32s10.336-32 32-32h192c21.664 0 32 10.336 32 32s-10.336 32-32 32H224z m0 256c-21.664 0-32-10.336-32-32s10.336-32 32-32h288c21.664 0 32 10.336 32 32s-10.528 32-32 32H224z" />
                  </svg>
                </el-badge>
              </div>
              <span>反馈管理</span>
            </div>
          </template>
        </div>
      </div>
      <div class="mine-card">
        <div class="pwd-head">
          <span class="mine-title" style="margin-bottom:0">{{ user.hasPassword ? '登录密码' : '设置密码' }}</span>
          <el-button link type="primary" @click="openPwdDialog">
            <svg class="btn-ico" viewBox="0 0 1024 1024" width="15" height="15" fill="currentColor">
              <path d="M807.28626 393.9647l-59.057047 0 0-78.729086c0-130.193201-105.96438-236.099253-236.229213-236.099253S275.770787 185.042413 275.770787 315.235614l0 78.729086-59.057047 0c-32.616862 0-59.057047 26.425859-59.057047 59.025325L157.656693 885.838314c0 32.598442 26.441209 59.025325 59.057047 59.025325l590.57252 0c32.616862 0 59.057047-26.425859 59.057047-59.025325L866.343307 452.989001C866.343307 420.390559 839.903122 393.9647 807.28626 393.9647zM334.827835 315.235614c0-97.644901 79.473029-177.074951 177.172165-177.074951s177.172165 79.43005 177.172165 177.074951l0 78.729086L334.827835 393.9647 334.827835 315.235614zM807.28626 885.838314 216.71374 885.838314 216.71374 452.989001l590.57252 0L807.28626 885.838314z" />
              <path d="M512 777.635963c16.302291 0 29.528524-13.219069 29.528524-29.512151L541.528524 590.723969c0-16.293081-13.226233-29.512151-29.528524-29.512151s-29.528524 13.219069-29.528524 29.512151l0 157.399843C482.471476 764.416893 495.697709 777.635963 512 777.635963z" />
            </svg>
            {{ user.hasPassword ? '修改密码' : '设置密码' }}
          </el-button>
        </div>
      </div>
      <el-button class="logout-btn" type="danger" plain @click="doLogout">退出登录</el-button>

      <!-- 字典管理弹窗:一条 = 一个平台 + 这个平台上用的账号,新增/修改/删除都在这里 -->
      <el-dialog v-model="dictVisible" title="字典管理"
        :width="isMobile ? '100%' : '560px'" :fullscreen="isMobile">
        <div class="dict-tip">这里维护「记一笔」里的平台和对应账号。记一笔选中平台后,账号自动带出来,不用再手打;改了会把已记台账里用这个平台的记录一起改掉,删除则只删选项、老记录不变。</div>
        <div v-for="g in dictGroups" :key="g.type" class="dict-group">
          <div class="dict-group-head">
            <div class="dict-group-title">
              {{ g.label }}<em>{{ g.items.length }}</em>
              <small>{{ g.tip }}</small>
            </div>
            <el-button size="small" type="primary" plain @click="openDictEdit(g.type, null)">新增</el-button>
          </div>
          <div v-if="g.items.length" class="dict-items">
            <div v-for="item in g.items" :key="item.name" class="dict-item">
              <div class="dict-item-main">
                <span class="dict-item-name">{{ item.name }}</span>
                <span :class="['dict-item-account', !item.account && 'empty']">
                  {{ item.account || '未填账号' }}
                </span>
              </div>
              <div class="dict-item-ops">
                <el-button link type="primary" @click="openDictEdit(g.type, item)">修改</el-button>
                <el-button link type="danger" @click="deleteDictItem(g.type, item.name)">删除</el-button>
              </div>
            </div>
          </div>
          <div v-else class="dict-empty">还没有,点右上角「新增」</div>
        </div>
        <template #footer>
          <el-button @click="dictVisible = false">关闭</el-button>
        </template>
      </el-dialog>

      <!-- 新增/修改字典:平台名 + 这个平台上用的账号 -->
      <el-dialog v-model="dictEditVisible" :title="dictEditTitle"
        :width="isMobile ? '92%' : '420px'" append-to-body>
        <el-form label-width="88px" label-position="left" @submit.prevent>
          <el-form-item :label="OPTION_TYPES[dictEdit.type].label">
            <el-input v-model="dictEdit.name" maxlength="30"
              placeholder="如 微信、淘宝" @keyup.enter="saveDictEdit" />
          </el-form-item>
          <el-form-item label="账号/名称">
            <el-input v-model="dictEdit.account" maxlength="50"
              placeholder="选填,记一笔时自动带出" @keyup.enter="saveDictEdit" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dictEditVisible = false">取消</el-button>
          <el-button type="primary" :loading="dictSaving" @click="saveDictEdit">保存</el-button>
        </template>
      </el-dialog>

      <!-- 用户管理弹窗(仅管理员) -->
      <el-dialog v-model="adminVisible" title="用户管理"
        :width="isMobile ? '100%' : '780px'" :fullscreen="isMobile">
        <div class="admin-bar">
          <el-input v-model="adminQuery.phone" placeholder="按手机号搜索" clearable
            style="width:180px" @keyup.enter="searchUsers" />
          <el-button type="primary" @click="searchUsers">查询</el-button>
        </div>
        <!-- 手机:用户卡片 -->
        <div v-if="isMobile" class="admin-list">
          <div v-for="row in adminRows" :key="row.id" class="admin-card">
            <div class="admin-card-head">
              <div>
                <div class="admin-phone">{{ row.phone }}</div>
                <div class="admin-sub">{{ row.nickname || '-' }} · {{ (row.createTime || '').slice(0, 10) }}</div>
              </div>
              <div class="admin-tags">
                <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
                  {{ row.role === 'admin' ? '管理员' : '用户' }}
                </el-tag>
                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                  {{ row.status === 1 ? '正常' : '禁用' }}
                </el-tag>
              </div>
            </div>
            <div v-if="row.id !== user.id" class="admin-card-ops">
              <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" plain @click="toggleStatus(row)">
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button size="small" type="primary" plain @click="resetPwd(row)">重置密码</el-button>
              <el-popconfirm :width="260" title="删除该用户及其全部台账记录?"
                @confirm="removeUser(row)">
                <template #reference>
                  <el-button size="small" type="danger" plain>删除</el-button>
                </template>
              </el-popconfirm>
            </div>
            <div v-else class="admin-card-ops dim">当前登录账号</div>
          </div>
          <el-empty v-if="!adminRows.length" description="暂无用户" />
        </div>

        <!-- 电脑:表格 -->
        <el-table v-else :data="adminRows" size="small">
          <el-table-column prop="phone" label="手机号" width="115" />
          <el-table-column prop="nickname" label="用户名" min-width="90" show-overflow-tooltip />
          <el-table-column label="角色" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
                {{ row.role === 'admin' ? '管理员' : '用户' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '正常' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="注册时间" width="100">
            <template #default="{ row }">{{ (row.createTime || '').slice(0, 10) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <template v-if="row.id !== user.id">
                <el-button size="small" plain :type="row.status === 1 ? 'warning' : 'success'" @click="toggleStatus(row)">
                  {{ row.status === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-button size="small" plain type="primary" @click="resetPwd(row)">重置密码</el-button>
                <el-popconfirm :width="260" title="删除该用户及其全部台账记录?"
                  @confirm="removeUser(row)">
                  <template #reference>
                    <el-button size="small" plain type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
              <span v-else class="dim">当前账号</span>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination class="pager" background layout="prev, pager, next" :total="adminTotal"
          v-model:current-page="adminQuery.current" v-model:page-size="adminQuery.size" @change="loadUsers" />
      </el-dialog>

      <!-- 修改/设置密码弹窗 -->
      <el-dialog v-model="pwdDialogVisible" :title="user.hasPassword ? '修改密码' : '设置密码'"
        width="360px" align-center>
        <el-input v-model="newPassword" type="password" show-password maxlength="20"
          placeholder="新密码(6~20位,含字母和数字)" @keyup.enter="savePassword" />
        <div v-if="newPwdError" class="field-tip err" style="margin:8px 0 0 2px">{{ newPwdError }}</div>
        <template #footer>
          <el-button @click="pwdDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePassword">保存</el-button>
        </template>
      </el-dialog>

      <!-- 头像查看弹窗:查看大图 + 更换/保存 -->
      <el-dialog v-model="avatarView" title="头像" width="320px" align-center class="avatar-dialog">
        <div class="avatar-view">
          <img :src="displaySrc(user.avatar)" class="avatar-view-img" alt="头像" />
          <div class="avatar-view-ops">
            <el-upload action="/api/file/upload" :headers="uploadHeaders" :show-file-list="false"
              :before-upload="beforeImageUpload" :on-success="onAvatarOk" :on-error="onAvatarErr" accept="image/*">
              <el-button type="primary" plain>更换头像</el-button>
            </el-upload>
            <el-button plain @click="saveAvatarImage">保存图片</el-button>
          </div>
        </div>
      </el-dialog>

      <!-- 意见反馈弹窗(用户提交 + 查看自己的反馈与回复) -->
      <el-dialog v-model="fbVisible" title="意见反馈"
        :width="isMobile ? '100%' : '560px'" :fullscreen="isMobile">
        <div class="fb-form">
          <el-input v-model="fbContent" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }"
            maxlength="1000" show-word-limit placeholder="说说你的问题或建议…" />
          <el-upload class="fb-upload" action="/api/file/upload" list-type="picture-card"
            :headers="uploadHeaders" v-model:file-list="fbFileList" :before-upload="beforeImageUpload"
            :on-success="onFbUploadOk" :on-remove="syncFbImages" :on-error="onFbUploadErr"
            :on-preview="onFbPreview" accept="image/*">
            <el-icon><Plus /></el-icon>
          </el-upload>
          <el-button type="primary" style="width:100%" :loading="fbSubmitting" @click="submitFeedback">提交反馈</el-button>
        </div>

        <div class="fb-title">我的反馈</div>
        <div v-if="!fbMine.length" class="dim" style="text-align:center;padding:12px">还没有反馈记录</div>
        <div v-for="fb in fbMine" :key="fb.id" class="fb-item">
          <div class="fb-item-head">
            <span class="dim">{{ (fb.createTime || '').replace('T', ' ').slice(0, 16) }}</span>
            <el-tag :type="fb.replied ? 'success' : 'info'" size="small">{{ fb.replied ? '已回复' : '待回复' }}</el-tag>
          </div>
          <div class="fb-content">{{ fb.content }}</div>
          <div v-if="fbImgs(fb).length" class="fb-imgs">
            <el-image v-for="(u, i) in fbImgs(fb)" :key="u + i" :src="displaySrc(u)" fit="cover"
              class="fb-img" @click="openImagePreview(fbImgs(fb), i)" />
          </div>
          <div v-if="fb.replied" class="fb-reply"><b>管理员回复:</b>{{ fb.reply }}</div>
        </div>
      </el-dialog>

      <!-- 反馈管理弹窗(仅管理员) -->
      <el-dialog v-model="adminFbVisible" title="反馈管理"
        :width="isMobile ? '100%' : '720px'" :fullscreen="isMobile">
        <div class="admin-bar">
          <el-radio-group v-model="adminFbQuery.replied" @change="loadFeedback">
            <el-radio-button :value="null">全部</el-radio-button>
            <el-radio-button :value="0">待回复</el-radio-button>
            <el-radio-button :value="1">已回复</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="!adminFbRows.length" class="dim" style="text-align:center;padding:16px">暂无反馈</div>
        <div v-for="fb in adminFbRows" :key="fb.id" class="fb-item">
          <div class="fb-item-head">
            <span>{{ fb.ownerNickname || '-' }} · {{ fb.ownerPhone }}</span>
            <span class="dim">{{ (fb.createTime || '').replace('T', ' ').slice(0, 16) }}</span>
          </div>
          <div class="fb-content">{{ fb.content }}</div>
          <div v-if="fbImgs(fb).length" class="fb-imgs">
            <el-image v-for="(u, i) in fbImgs(fb)" :key="u + i" :src="displaySrc(u)" fit="cover"
              class="fb-img" @click="openImagePreview(fbImgs(fb), i)" />
          </div>
          <div v-if="fb.replied" class="fb-reply"><b>已回复:</b>{{ fb.reply }}</div>
          <div class="fb-reply-box">
            <el-input v-model="fbReplyText[fb.id]" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }"
              maxlength="1000" :placeholder="fb.replied ? '修改回复…' : '输入回复…'" />
            <el-button type="primary" size="small" :loading="fbReplying === fb.id" @click="replyFeedback(fb)">
              {{ fb.replied ? '更新回复' : '回复' }}
            </el-button>
          </div>
        </div>
        <el-pagination class="pager" background layout="prev, pager, next" :total="adminFbTotal"
          v-model:current-page="adminFbQuery.current" v-model:page-size="adminFbQuery.size" @change="loadFeedback" />
      </el-dialog>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="详情"
      class="detail-dialog" :width="isMobile ? '100%' : '720px'" :fullscreen="isMobile">
      <div class="detail-hero">
        <div>
          <div class="detail-name">{{ detail.itemName || '-' }}</div>
          <div class="detail-meta">{{ detail.recordDate || '-' }} · {{ detail.taskType || '-' }}</div>
        </div>
        <div class="detail-hero-right">
          <strong>{{ detail.cost != null ? '¥' + detail.cost : '-' }}</strong>
          <el-tag :type="statusColor(detail.status)" size="small">{{ detail.status }}</el-tag>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-cell"><span>本金状态</span><b :class="detail.costBack === 1 ? 'ok' : 'warn'">{{ detail.costBack === 1 ? '已返' : '未返' }}</b></div>
        <div class="detail-cell"><span>押金</span><b>{{ detail.deposit != null ? '¥' + detail.deposit : '-' }}</b></div>
        <div class="detail-cell"><span>接单平台</span><b>{{ detail.platform || '-' }}</b></div>
        <div class="detail-cell"><span>下单平台</span><b>{{ detail.account || '-' }}</b></div>
        <div v-if="detail.platformAccount" class="detail-cell">
          <span>{{ detail.platform || '接单' }}账号</span><b class="ellipsis">{{ detail.platformAccount }}</b>
        </div>
        <div v-if="detail.platformGroup" class="detail-cell">
          <span>{{ detail.platform || '接单' }}群</span><b class="ellipsis">{{ detail.platformGroup }}</b>
        </div>
        <div v-if="detail.shopAccount" class="detail-cell">
          <span>{{ detail.account || '下单' }}账号</span><b class="ellipsis">{{ detail.shopAccount }}</b>
        </div>
        <div v-for="(no, i) in detailOrderNos" :key="no" class="detail-cell order-cell" @click="copyText(no)">
          <span>订单号{{ detailOrderNos.length > 1 ? i + 1 : '' }} · 点击复制</span>
          <b class="ellipsis">{{ no }}</b>
        </div>
        <div class="detail-cell"><span>是否签收</span><b :class="detail.received === 1 ? 'ok' : ''">{{ detail.received === 1 ? '是' : '否' }}</b></div>
        <div class="detail-cell"><span>是否拍摄</span><b :class="detail.shot === 1 ? 'ok' : ''">{{ detail.shot === 1 ? '是' : '否' }}</b></div>
        <div v-if="detail.taskType === '寄拍'" class="detail-cell"><span>佣金</span><b>{{ detail.commission != null ? '¥' + detail.commission : '-' }}</b></div>
        <div v-if="detail.taskType === '寄拍'" class="detail-cell"><span>佣金状态</span><b :class="detail.commissionBack === 1 ? 'ok' : 'warn'">{{ detail.commissionBack === 1 ? '已返' : '未返' }}</b></div>
        <div v-if="detail.expressFee != null" class="detail-cell"><span>快递费</span><b>{{ detail.expressFeeType || '' }} ¥{{ detail.expressFee }}</b></div>
        <div v-if="detail.expressCompany || detail.expressNo" class="detail-cell"><span>寄回快递</span><b>{{ detail.expressCompany }} {{ detail.expressNo }}</b></div>
      </div>

      <div class="detail-text-list">
        <div class="detail-text"><span>出图要求</span><p>{{ detail.requirement || '无' }}</p></div>
        <div class="detail-text"><span>备注</span><p>{{ detail.remark || '无' }}</p></div>
      </div>

      <!-- 快递查询 -->
      <div v-if="detail.expressNo" class="detail-block">
        <div class="detail-title express-title">
          <span>快递物流</span>
          <el-button type="primary" size="small" plain :loading="express.loading" @click="queryExpress">
            {{ express.queried ? '刷新' : '查询快递状态' }}
          </el-button>
        </div>
        <div class="express-line">
          <span class="dim">{{ detail.expressCompany || '快递' }} · {{ detail.expressNo }}</span>
          <el-tag v-if="express.result && express.result.statusText"
            :type="expressTagType(express.result.statusText)" size="small">
            {{ express.result.statusText }}
          </el-tag>
        </div>
        <div v-if="express.result && express.result.traces && express.result.traces.length" class="express-traces">
          <div v-for="(t, i) in express.result.traces" :key="i" :class="['express-trace', i === 0 && 'latest']">
            <div class="express-time">{{ t.time }}</div>
            <div class="express-ctx">{{ t.context }}</div>
          </div>
        </div>
        <div v-else-if="express.queried && !express.loading" class="express-empty">
          {{ (express.result && express.result.message) || '暂无物流信息' }}
        </div>
      </div>

      <!-- 评价截图 / 订单截图:只看不传,想改回「记一笔」里编辑 -->
      <div v-for="g in detailShotGroups" :key="g.title" class="detail-block">
        <div class="detail-title">
          <span>{{ g.title }}</span>
          <span class="detail-count">{{ g.urls.length }} 张</span>
        </div>
        <div class="shot-grid">
          <img v-for="(u, i) in g.urls" :key="u" class="shot-img" :src="displaySrc(u)" :alt="g.title"
            loading="lazy" @click="openImagePreview(g.urls, i)" />
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-title">{{ isAdmin ? '样例' : '样例(可上传多张,传完自动保存)' }}</div>
        <el-upload action="/api/file/upload" list-type="picture-card" multiple :headers="uploadHeaders"
          :disabled="isAdmin"
          v-model:file-list="sampleList" :on-success="onSampleOk"
          :on-remove="onSampleRemove" :on-error="onSampleErr"
          :before-upload="beforeImageUpload" :on-preview="onSamplePreview" accept="image/*">
          <svg class="upload-ico" viewBox="0 0 1024 1024" width="26" height="26" fill="currentColor">
            <path d="M576 928H192c-52.992 0-96-43.093333-96-96V192c0-52.992 43.093333-96 96-96h640c52.992 0 96 43.093333 96 96v384.064c0 17.706667-14.293333 32-32 32s-32-14.293333-32-32V192.021333c0-17.706667-14.4-32-32-32H192c-17.706667 0-32 14.378667-32 32v639.957334c0 17.706667 14.4 32 32 32h384c17.706667 0 32 14.314667 32 32 0 17.706667-14.293333 32.021333-32 32.021333zM128 693.312a32.064 32.064 0 0 1-22.613333-54.698667l159.402666-159.338666a95.786667 95.786667 0 0 1 110.72-17.984l173.589334 86.805333c12.309333 6.186667 27.093333 3.797333 36.8-5.994667l287.402666-287.445333a32.042667 32.042667 0 0 1 45.290667 45.312L631.210667 587.392a95.786667 95.786667 0 0 1-110.72 18.005333l-173.589334-86.826666a31.616 31.616 0 0 0-36.8 6.016l-159.509333 159.317333c-6.186667 6.314667-14.4 9.386667-22.592 9.386667z m320-277.376c-52.906667 0-96-43.093333-96-96s43.093333-96.021333 96-96.021333 96 43.093333 96 96-43.093333 96.021333-96 96.021333z m0-128c-17.6 0-32 14.378667-32 32 0 17.6 14.4 32 32 32s32-14.4 32-32c0-17.621333-14.4-32-32-32zM768 928c-17.706667 0-32-14.293333-32-32v-192.021333c0-17.706667 14.293333-32 32-32s32 14.293333 32 32v192c0 17.706667-14.293333 32.021333-32 32.021333z m128-128c-7.893333 0-15.701333-2.922667-21.909333-8.725333L768 691.669333l-106.090667 99.712a31.936 31.936 0 0 1-45.226666-1.408 31.957333 31.957333 0 0 1 1.408-45.205333l112.213333-105.386667A48.554667 48.554667 0 0 1 768 621.44c14.72 0 28.501333 6.613333 37.696 17.92l112.213333 105.386667A31.957333 31.957333 0 0 1 896 800z"/>
          </svg>
        </el-upload>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="!isAdmin" type="primary" @click="detailVisible = false; openDialog(detail)">去编辑</el-button>
      </template>
    </el-dialog>

    <!-- 修改用户名弹窗 -->
    <el-dialog v-model="nicknameDialog.visible" title="修改用户名"
      :width="isMobile ? '86%' : '420px'">
      <el-input v-model="nicknameDialog.value" maxlength="20" show-word-limit clearable
        placeholder="请输入用户名" @keyup.enter="saveNickname" />
      <template #footer>
        <el-button @click="nicknameDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="nicknameDialog.saving" @click="saveNickname">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑弹窗 -->
    <!-- AI 修图助手(通义千问图像编辑) -->
    <el-dialog v-model="aiEdit.visible" title="AI 修图助手" class="ai-edit-dialog"
      :width="isMobile ? '100%' : '640px'" :fullscreen="isMobile" :close-on-click-modal="!aiEdit.loading"
      @closed="resetAiEdit">
      <input ref="aiFileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onAiFilePick" />
      <div class="ai-edit-images">
        <div class="ai-edit-pane">
          <div class="ai-edit-label">原图</div>
          <div class="ai-edit-box clickable" @click="!aiEdit.loading && aiFileInput.click()">
            <img v-if="aiEdit.srcUrl" :src="aiEdit.srcUrl" alt="原图" />
            <span v-else class="ai-edit-empty">点这里选一张图片</span>
          </div>
        </div>
        <div class="ai-edit-pane">
          <div class="ai-edit-label">修好的图</div>
          <div class="ai-edit-box" v-loading="aiEdit.loading" :element-loading-text="aiLoadingText">
            <img v-if="aiEdit.result" :src="displaySrc(aiEdit.result)" alt="修好的图"
              @click="openImagePreview([aiEdit.result])" />
            <span v-else-if="!aiEdit.loading" class="ai-edit-empty">修好后显示在这里</span>
          </div>
        </div>
      </div>
      <div class="ai-edit-presets">
        <el-check-tag v-for="p in AI_EDIT_PRESETS" :key="p.label" :checked="aiEdit.prompt === p.prompt"
          @change="aiEdit.prompt = p.prompt">{{ p.label }}</el-check-tag>
      </div>
      <el-input v-model="aiEdit.prompt" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" maxlength="500"
        show-word-limit placeholder="说说想怎么修,比如:把背景换成纯白色,商品保持不变" />
      <div class="ai-edit-hint">要求越窄越稳:只说「抠白底」「去杂物」这类局部改动,别让它重画人物</div>
      <div v-if="aiEdit.error && !aiEdit.loading" class="ai-edit-error">
        <b>没修成:{{ aiEdit.error }}</b>
        <span v-if="aiEditModerated">
          同一张图每次生成的结果都不一样,直接点下面的「重新修」多半就过了;
          还不行就把要求写窄一点,或者换张少露人、以商品为主的图。
        </span>
      </div>
      <!-- 按钮放在内容区里跟着一起滚动:手机上放弹窗底栏会被固定的底部导航挡住 -->
      <div class="ai-edit-actions">
        <el-button type="primary" :loading="aiEdit.loading" @click="runAiEdit">
          {{ aiEdit.result ? '重新修' : '开始修图' }}
        </el-button>
        <template v-if="aiEdit.result && !aiEdit.loading">
          <el-button type="success" @click="useAiResult">用这张记一笔</el-button>
          <a class="el-button" :href="displaySrc(aiEdit.result)" download>下载</a>
        </template>
        <el-button @click="aiEdit.visible = false" :disabled="aiEdit.loading">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="form.id ? '记一笔' : '记一笔'"
      class="record-dialog" :width="isMobile ? '100%' : '640px'" :fullscreen="isMobile" destroy-on-close>
      <div class="record-extract-bar">
        <div class="record-extract-copy">
          <strong>截图识别填表</strong>
          <span>{{ recordExtract.fileName || '自动提取商品名、商品价格、出图要求和备注' }}</span>
        </div>
        <input ref="recordExtractInput" type="file" accept="image/jpeg,image/png,image/webp" hidden
          @change="onRecordExtractPick" />
        <el-button type="primary" :loading="recordExtract.loading" @click="pickRecordExtract">
          {{ recordExtract.loading ? '识别中' : '选择截图' }}
        </el-button>
      </div>
      <el-form class="record-form" :model="form" ref="formRef" :rules="rules" label-width="90px">
        <el-row :gutter="12">
          <el-col class="form-half" :span="12" :xs="12">
            <el-form-item label="日期" prop="recordDate">
              <el-date-picker v-model="form.recordDate" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col class="form-half" :span="12" :xs="12">
            <el-form-item label="商品名" prop="itemName">
              <el-input v-model="form.itemName" placeholder="如：短袖" />
            </el-form-item>
          </el-col>
          <el-col class="form-half" :span="12" :xs="12">
            <el-form-item label="类型" prop="taskType">
              <el-select v-model="form.taskType" style="width:100%">
                <el-option v-for="t in taskTypes" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col class="form-half" :span="12" :xs="12">
            <el-form-item label="商品价格" prop="cost">
              <el-input-number v-model="form.cost" :min="0" :precision="2" :controls="false" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col class="form-half form-switch" :span="12" :xs="12">
            <el-form-item label="本金状态" prop="costBack">
              <el-switch v-model="form.costBack" :active-value="1" :inactive-value="0"
                active-text="已返" inactive-text="未返" />
            </el-form-item>
          </el-col>
          <el-col class="form-half" :span="12" :xs="12">
            <el-form-item label="押金">
              <el-input-number v-model="form.deposit" :min="0" :precision="2" :controls="false"
                placeholder="无押金可不填" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col v-if="form.taskType === '寄拍'" class="form-half" :span="12" :xs="12">
            <el-form-item label="佣金">
              <el-input-number v-model="form.commission" :min="0" :precision="2" :controls="false" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col v-if="form.taskType === '寄拍'" class="form-half form-switch" :span="12" :xs="12">
            <el-form-item label="佣金状态">
              <el-switch v-model="form.commissionBack" :active-value="1" :inactive-value="0"
                active-text="已返" inactive-text="未返" />
            </el-form-item>
          </el-col>
          <el-col class="form-half" :span="12" :xs="12">
            <el-form-item label="接单平台" prop="platform">
              <el-select
                  v-model="form.platform"
                  clearable
                  placeholder="请选择"
                  style="width: 100%"
                  popper-class="platform-select-popper"
                  @change="onPlatformOptionChange('platform', $event)"
              >
                <el-option
                    v-for="p in platforms"
                    :key="p.name"
                    :label="p.name"
                    :value="p.name"
                >
                  <div class="platform-option-row">
                    <span class="platform-option-text">{{ p.name }}</span>
                    <span v-if="p.account" class="platform-option-account">{{ p.account }}</span>

                    <button
                        type="button"
                        class="platform-delete-icon"
                        title="删除"
                        aria-label="删除平台"
                        @mousedown.prevent.stop
                        @touchstart.stop
                        @click.prevent.stop="deleteDictItem('platform', p.name)"
                    >
                      ×
                    </button>
                  </div>
                </el-option>

                <el-option
                    label="＋"
                    value="__add_platform__"
                    class="select-add-option"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <!-- 选了接单平台才出现:账号就是字典里给这个平台填的那个,这里只读展示 -->
          <el-col v-if="form.platform" class="form-half" :span="12" :xs="12">
            <el-form-item :label="form.platform + '账号'" prop="platformAccount">
              <el-input v-model="form.platformAccount" readonly
                placeholder="字典里没填账号" class="dict-readonly">
              </el-input>
            </el-form-item>
          </el-col>
          <el-col v-if="form.platform" class="form-half" :span="12" :xs="12">
            <el-form-item :label="form.platform + '群'" prop="platformGroup">
              <el-input v-model="form.platformGroup" maxlength="50"
                :placeholder="'选填,' + form.platform + '群号/群名'" />
            </el-form-item>
          </el-col>
          <el-col class="form-half" :span="12" :xs="12">
            <el-form-item label="下单平台" prop="account">
              <el-select
                  v-model="form.account"
                  clearable
                  placeholder="请选择"
                  style="width: 100%"
                  popper-class="platform-select-popper"
                  @change="onPlatformOptionChange('account', $event)"
              >
                <el-option
                    v-for="a in accounts"
                    :key="a.name"
                    :label="a.name"
                    :value="a.name"
                >
                  <div class="platform-option-row">
                    <span class="platform-option-text">{{ a.name }}</span>
                    <span v-if="a.account" class="platform-option-account">{{ a.account }}</span>

                    <button
                        type="button"
                        class="platform-delete-icon"
                        title="删除"
                        aria-label="删除平台"
                        @mousedown.prevent.stop
                        @touchstart.stop
                        @click.prevent.stop="deleteDictItem('account', a.name)"
                    >
                      ×
                    </button>
                  </div>
                </el-option>

                <el-option
                    label="＋"
                    value="__add_account__"
                    class="select-add-option"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <!-- 选了下单平台才出现:账号同样取字典里的,只读;订单号才是每笔单自己的 -->
          <el-col v-if="form.account" class="form-half" :span="12" :xs="12">
            <el-form-item :label="form.account + '账号'" prop="shopAccount">
              <el-input v-model="form.shopAccount" readonly
                placeholder="字典里没填账号" class="dict-readonly">
              </el-input>
            </el-form-item>
          </el-col>
          <!-- 一笔单可能有多个订单号:最后一行的 ＋ 加一行,前面几行的 × 删掉这行 -->
          <el-col v-if="form.account" class="form-half" :span="12" :xs="12">
            <el-form-item :label="form.account + '订单号'" prop="orderNo">
              <div class="order-no-list">
                <button type="button" class="order-no-add" @click="addOrderNo">＋ 添加订单号</button>
                <el-input v-for="(n, i) in orderNos" :key="i" v-model="orderNos[i]" maxlength="64"
                  :placeholder="`订单号${i + 1},选填`" @input="syncOrderNos" @change="syncOrderNos">
                  <template #append>
                    <button type="button" class="order-no-btn del"
                      :title="`删掉订单号${i + 1}`" @click="removeOrderNo(i)">×</button>
                  </template>
                </el-input>
              </div>
            </el-form-item>
          </el-col>
          <el-col class="form-half form-switch" :span="12" :xs="12">
            <el-form-item label="是否签收">
              <el-switch v-model="form.received" :active-value="1" :inactive-value="0"
                active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col class="form-half form-switch" :span="12" :xs="12">
            <el-form-item label="是否拍摄">
              <el-switch v-model="form.shot" :active-value="1" :inactive-value="0"
                active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width:100%">
                <el-option v-for="s in statuses" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="快递单号">
              <el-input v-model="form.expressNo" placeholder="选填" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="快递公司">
              <el-select v-model="form.expressCompany" clearable
                placeholder="选填" style="width:100%">
                <el-option v-for="c in expressCompanies" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="form.status === '已寄回'" class="form-half" :span="12" :xs="12">
            <el-form-item label="快递费类型">
              <el-select v-model="form.expressFeeType" placeholder="个人/商家" clearable style="width:100%">
                <el-option label="个人" value="个人" />
                <el-option label="商家" value="商家" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="form.status === '已寄回'" class="form-half" :span="12" :xs="12">
            <el-form-item label="快递费">
              <el-input-number v-model="form.expressFee" :min="0" :precision="2" :controls="false" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="出图要求" prop="requirement">
              <el-input v-model="form.requirement" placeholder="如:5张平铺 + 上身图 + 视频" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 8 }"
                placeholder="选填" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="图片" prop="images">
              <el-upload action="/api/file/upload" list-type="picture-card" :headers="uploadHeaders"
                v-model:file-list="fileList" :on-success="onUploadOk" :on-remove="syncImages"
                :on-error="onUploadErr" :before-upload="beforeImageUpload"
                :on-preview="onImagePreview" accept="image/*">
                <svg class="upload-ico" viewBox="0 0 1024 1024" width="26" height="26" fill="currentColor">
            <path d="M576 928H192c-52.992 0-96-43.093333-96-96V192c0-52.992 43.093333-96 96-96h640c52.992 0 96 43.093333 96 96v384.064c0 17.706667-14.293333 32-32 32s-32-14.293333-32-32V192.021333c0-17.706667-14.4-32-32-32H192c-17.706667 0-32 14.378667-32 32v639.957334c0 17.706667 14.4 32 32 32h384c17.706667 0 32 14.314667 32 32 0 17.706667-14.293333 32.021333-32 32.021333zM128 693.312a32.064 32.064 0 0 1-22.613333-54.698667l159.402666-159.338666a95.786667 95.786667 0 0 1 110.72-17.984l173.589334 86.805333c12.309333 6.186667 27.093333 3.797333 36.8-5.994667l287.402666-287.445333a32.042667 32.042667 0 0 1 45.290667 45.312L631.210667 587.392a95.786667 95.786667 0 0 1-110.72 18.005333l-173.589334-86.826666a31.616 31.616 0 0 0-36.8 6.016l-159.509333 159.317333c-6.186667 6.314667-14.4 9.386667-22.592 9.386667z m320-277.376c-52.906667 0-96-43.093333-96-96s43.093333-96.021333 96-96.021333 96 43.093333 96 96-43.093333 96.021333-96 96.021333z m0-128c-17.6 0-32 14.378667-32 32 0 17.6 14.4 32 32 32s32-14.4 32-32c0-17.621333-14.4-32-32-32zM768 928c-17.706667 0-32-14.293333-32-32v-192.021333c0-17.706667 14.293333-32 32-32s32 14.293333 32 32v192c0 17.706667-14.293333 32.021333-32 32.021333z m128-128c-7.893333 0-15.701333-2.922667-21.909333-8.725333L768 691.669333l-106.090667 99.712a31.936 31.936 0 0 1-45.226666-1.408 31.957333 31.957333 0 0 1 1.408-45.205333l112.213333-105.386667A48.554667 48.554667 0 0 1 768 621.44c14.72 0 28.501333 6.613333 37.696 17.92l112.213333 105.386667A31.957333 31.957333 0 0 1 896 800z"/>
          </svg>
              </el-upload>
            </el-form-item>
          </el-col>
          <!-- 评价截图/订单截图:选填,存起来方便以后对账和申诉,详情页里能看 -->
          <el-col :span="24">
            <el-form-item label="评价截图">
              <el-upload action="/api/file/upload" list-type="picture-card" multiple :headers="uploadHeaders"
                v-model:file-list="reviewList" :before-upload="beforeImageUpload"
                :on-success="(res, file) => onShotOk(res, file, 'reviewImages')"
                :on-remove="() => syncShots('reviewImages')"
                :on-error="(err, file) => onShotErr(err, file, 'reviewImages')"
                :on-preview="file => onShotPreview(file, 'reviewImages')" accept="image/*">
                <el-icon class="upload-ico"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="订单截图">
              <el-upload action="/api/file/upload" list-type="picture-card" multiple :headers="uploadHeaders"
                v-model:file-list="orderList" :before-upload="beforeImageUpload"
                :on-success="(res, file) => onShotOk(res, file, 'orderImages')"
                :on-remove="() => syncShots('orderImages')"
                :on-error="(err, file) => onShotErr(err, file, 'orderImages')"
                :on-preview="file => onShotPreview(file, 'orderImages')" accept="image/*">
                <el-icon class="upload-ico"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 全屏图片查看器:支持手机双指缩放、桌面滚轮缩放、拖动平移、左右切换 -->
    <teleport to="body">
      <div v-if="previewVisible" class="img-viewer" @click.self="closePreview">
        <div class="iv-close" @click="closePreview">×</div>
        <div ref="ivStage" class="iv-stage" @wheel.prevent="onWheel"
          @touchstart="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onTouchEnd"
          @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="endDrag" @mouseleave="endDrag"
          @dblclick="toggleZoom">
          <img :src="displaySrc(previewUrls[previewIndex])" class="iv-img" :style="ivImgStyle"
            draggable="false" @click.stop />
        </div>
        <template v-if="previewUrls.length > 1">
          <div class="iv-nav prev" @click.stop="stepImg(-1)">‹</div>
          <div class="iv-nav next" @click.stop="stepImg(1)">›</div>
          <div class="iv-count">{{ previewIndex + 1 }} / {{ previewUrls.length }}</div>
        </template>
      </div>
    </teleport>

    <!-- 底部导航:teleport 到 body,不放在 .page 这个滚动容器里。
         iOS/微信里 fixed 元素嵌在 overflow 滚动容器内,点击区域会和显示位置错开,要点好几下才生效 -->
    <teleport to="body">
    <nav class="tabbar">
      <!-- 手机用 touchend 直接切换:iOS Safari 对 div 的 click 要自己判定(是否滚动/双击/悬停),
           判定不通过就丢掉这次点击,表现为要点好几下。.prevent 会取消随后的 click,不会重复触发;
           电脑没有 touch 事件,仍走 click -->
      <div :class="['tab-item', activeTab === 'home' && 'active']"
        @touchend.prevent="switchTab('home')" @click="switchTab('home')">
        <svg class="tab-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.2 9.6 12 3l8.8 6.6h-1.3v8.6a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V9.6z" />
          <path d="M9.6 13.4a3.6 3.6 0 0 0 4.8 0" />
        </svg>
        <span>首页</span>
      </div>
      <div :class="['tab-item', activeTab === 'mine' && 'active']"
        @touchend.prevent="switchTab('mine')" @click="switchTab('mine')">
        <svg class="tab-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.3 9.6v2.2M14.7 9.6v2.2" />
        </svg>
        <span>我的</span>
      </div>
    </nav>
    </teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage as msg, ElMessageBox } from 'element-plus'
import { recordApi, authApi, adminApi, optionApi, expressApi, feedbackApi, aiApi } from './api'
import { parseRecord } from './smartParse'
import { Close, Plus } from '@element-plus/icons-vue'
const taskTypes = ['AB','送拍', '寄拍']
// 数据字典里的平台,一条是 { name: 平台名, account: 这个平台上用的账号 }
const platforms = ref([])
const accounts = ref([])
const statuses = ['进行中', '等返款', '等审核', '已寄回', '已完成']
const expressCompanies = ['中通', '圆通', '申通', '韵达', '顺丰', '邮政', '极兔', '京东']

// ---------- 每个用户独立的数据字典（存服务器,按 userId 隔离,跨设备一致） ----------
// 接单平台和下单平台走同一套「下拉里选 / ＋ 新增 / × 删除」,下面这张表说明每类的文案、
// 列表 ref、平台名存哪个表单字段、账号存哪个表单字段。
// 模板里只传 type 字符串,别把 ref 传进来(会被自动解包)
const OPTION_TYPES = {
  platform: { label: '接单平台', list: platforms, field: 'platform', accountField: 'platformAccount' },
  account: { label: '下单平台', list: accounts, field: 'account', accountField: 'shopAccount' }
}
const MAX_DICT_NAME = 30
const MAX_DICT_ACCOUNT = 50

async function loadPlatformOptions() {
  let data = null
  try {
    data = await optionApi.list()
  } catch { /* 拉不到就按空字典处理 */ }
  platforms.value = Array.isArray(data?.platforms) ? data.platforms : []
  accounts.value = Array.isArray(data?.accounts) ? data.accounts : []
}

/** 在字典里按平台名找这一条 */
function findOption(type, name) {
  return OPTION_TYPES[type].list.value.find(item => item.name === name) || null
}

async function onPlatformOptionChange(type, value) {
  const meta = OPTION_TYPES[type]
  // 换了平台,上一个平台的群/订单号就不对了,清掉重填
  if (type === 'platform') form.platformGroup = ''
  else { form.orderNo = ''; orderNos.value = [''] }

  // 选中的是列表末尾那个「＋」:弹框新增一个并直接选上
  if (value === `__add_${type}__`) {
    form[meta.field] = ''
    form[meta.accountField] = ''
    openDictEdit(type, null, name => { form[meta.field] = name; fillDictAccount(type) })
    return
  }
  fillDictAccount(type)
}



/** 账号跟着所选平台走,字典里填的是什么,记一笔时就记什么 */
function fillDictAccount(type) {
  const meta = OPTION_TYPES[type]
  const option = findOption(type, form[meta.field])
  form[meta.accountField] = option ? option.account || '' : ''
}

// ---------- 我的 - 字典管理 ----------
const dictVisible = ref(false)
const dictGroups = computed(() => [
  { type: 'platform', label: '接单平台', tip: '微信、QQ 这种接单的地方', items: platforms.value },
  { type: 'account', label: '下单平台', tip: '淘宝、抖音这种下单的地方', items: accounts.value }
])
function openDict() {
  dictVisible.value = true
  loadPlatformOptions()
}

// 新增/修改共用一个弹窗:平台名 + 这个平台上用的账号
const dictEditVisible = ref(false)
const dictSaving = ref(false)
const dictEdit = reactive({ type: 'platform', oldName: '', name: '', account: '' })
// 从记一笔的「＋」进来时,存好一个回调,保存成功后把新平台选上
let dictEditDone = null
const dictEditTitle = computed(() =>
  `${dictEdit.oldName ? '修改' : '新增'}${OPTION_TYPES[dictEdit.type].label}`)

/** item 传 null 是新增,传字典里的一条是修改 */
function openDictEdit(type, item, onSaved) {
  dictEdit.type = type
  dictEdit.oldName = item ? item.name : ''
  dictEdit.name = item ? item.name : ''
  dictEdit.account = item ? item.account || '' : ''
  dictEditDone = onSaved || null
  dictEditVisible.value = true
}

async function saveDictEdit() {
  const type = dictEdit.type
  const meta = OPTION_TYPES[type]
  const name = dictEdit.name.trim()
  const account = dictEdit.account.trim()
  if (!name) return msg.warning('请输入平台名称')
  if (name.length > MAX_DICT_NAME) return msg.warning(`平台名称不能超过${MAX_DICT_NAME}个字`)
  if (account.length > MAX_DICT_ACCOUNT) return msg.warning(`账号不能超过${MAX_DICT_ACCOUNT}个字`)
  if (name !== dictEdit.oldName && findOption(type, name)) return msg.warning(`“${name}”已经有了`)

  const old = dictEdit.oldName
  dictSaving.value = true
  let affected = 0
  try {
    if (old) affected = await optionApi.update(type, old, name, account) || 0
    else await optionApi.add(type, name, account)
  } catch (e) {
    msg.error(e.message || '保存失败')
    return
  } finally {
    dictSaving.value = false
  }

  if (old) {
    meta.list.value = meta.list.value.map(item => (item.name === old ? { name, account } : item))
    // 正在填的那条记录如果用的就是这个平台,表单里的名字和账号也跟着改
    if (form[meta.field] === old) {
      form[meta.field] = name
      form[meta.accountField] = account
    }
  } else {
    meta.list.value = [...meta.list.value, { name, account }]
  }

  dictEditVisible.value = false
  if (affected > 0) {
    msg.success(`已保存,同步更新了 ${affected} 条记录`)
    load()
    loadStats()
  } else {
    msg.success('已保存')
  }
  if (dictEditDone) {
    dictEditDone(name)
    dictEditDone = null
  }
}

/** 删除:只删字典里的选项,已经记过的台账保留原来的文字 */
async function deleteDictItem(type, name) {
  const meta = OPTION_TYPES[type]

  try {
    await ElMessageBox.confirm(
        `确定删除${meta.label}“${name}”吗？已记的台账不受影响。`,
        `删除${meta.label}`,
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )
  } catch {
    return // 取消删除
  }

  try {
    await optionApi.remove(type, name)
  } catch (e) {
    msg.error(e.message || '删除失败')
    return
  }

  meta.list.value = meta.list.value.filter(item => item.name !== name)
  if (form[meta.field] === name) {
    form[meta.field] = ''
    form[meta.accountField] = ''
  }
  msg.success('已删除')
}

// ---------- 登录 ----------
const logged = ref(!!localStorage.getItem('paitai_token'))
// 用响应式 ref 保存 token:localStorage 不是响应式的,直接在 computed 里读会被缓存,
// 导致换了新 token 后上传仍带旧 token。所有改动 token 的地方都要同步更新这个 ref。
const authToken = ref(localStorage.getItem('paitai_token') || '')
const user = ref(JSON.parse(localStorage.getItem('paitai_user') || '{}'))
const activeTab = ref('home')

// 首页和我的共用 .page 这一个滚动容器,切换时各自记住滚动位置,
// 否则从滚到底部的首页切到我的,我的会停在被截断的位置
const tabScroll = { home: 0, mine: 0 }
function switchTab(tab) {
  if (activeTab.value === tab) return
  const box = document.querySelector('.page.has-tabbar')
  if (box) tabScroll[activeTab.value] = box.scrollTop
  activeTab.value = tab
  nextTick(() => {
    const el = document.querySelector('.page.has-tabbar')
    if (el) el.scrollTop = tabScroll[tab] || 0
  })
}

const mode = ref('login') // login | register | reset
const loginType = ref('code')
const loginForm = reactive({ phone: '', code: '', password: '', confirm: '' })
const countdown = ref(0)
const loggingIn = ref(false)
const sending = ref(false)
let cdTimer = null

const PHONE_RE = /^1[3-9]\d{9}$/
const phoneValid = computed(() => PHONE_RE.test(loginForm.phone))
// 输入过程中不报错,输满11位或格式明显不对时才提示
const phoneError = computed(() => {
  const p = loginForm.phone
  if (!p || (p.length < 11 && /^\d*$/.test(p))) return ''
  return phoneValid.value ? '' : '请输入正确的手机号'
})
const passwordError = computed(() => {
  const p = loginForm.password
  if (!p) return ''
  if (p.length < 6 || p.length > 20) return '密码长度为6~20位'
  if (/^\d+$/.test(p)) return '密码不能是纯数字'
  if (/^[a-zA-Z]+$/.test(p)) return '密码不能是纯字母'
  return ''
})
const confirmError = computed(() =>
  loginForm.confirm && loginForm.confirm !== loginForm.password ? '两次输入的密码不一致' : '')

function onPhoneInput(v) {
  loginForm.phone = (v || '').replace(/\D/g, '').slice(0, 11)
}

// 切换登录/注册/重置时清空表单和倒计时,避免上一个模式的残留值
function switchMode(m) {
  mode.value = m
  loginForm.code = ''
  loginForm.password = ''
  loginForm.confirm = ''
  if (cdTimer) { clearInterval(cdTimer); countdown.value = 0 }
}

// 回车键:根据当前模式触发对应的主操作
function onPrimaryAction() {
  if (mode.value === 'register') doRegister()
  else if (mode.value === 'reset') doReset()
  else doLogin()
}

// 上传接口也要带 token。依赖响应式的 authToken,登录/退出后能自动拿到最新值,
// 不能直接读 localStorage(非响应式,会被 computed 缓存成第一次的旧值)。
const uploadHeaders = computed(() => ({ Authorization: authToken.value }))

// 手机相册可能返回 HEIC/HEIF 或超大原图；后端目前只接收常见 Web 图片且单张最多 10MB。
function beforeImageUpload(file, maxEdge = MAX_IMAGE_EDGE) {
  const name = (file.name || '').toLowerCase()
  const type = (file.type || '').toLowerCase()
  if (/\.(heic|heif)$/.test(name) || /hei[cf]/.test(type)) {
    msg.error('iPhone 的 HEIC/HEIF 照片暂不支持，请先在相册中转换或截图后上传')
    return false
  }
  const supportedName = /\.(jpe?g|png|gif|webp)$/.test(name)
  const supportedType = /^image\/(jpeg|jpg|png|gif|webp)$/.test(type)
  if (!supportedName && !supportedType) {
    msg.error('仅支持 JPG、PNG、GIF、WEBP 图片')
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    msg.error('单张图片不能超过 10MB，请压缩后重新上传')
    return false
  }
  return compressImage(file, maxEdge)
}

// 手机原图动辄几 MB、4000 多像素宽,列表缩略图直接用原图时,
// iPhone Safari 每次切回首页都要重新解码几十 MB 的位图,整页要等解码完才画出来。
// 上传前把长边压到 2048、转 JPEG(截图上的文字仍清晰),体积一般降到几百 KB。
const MAX_IMAGE_EDGE = 2048
async function compressImage(file, maxEdge = MAX_IMAGE_EDGE) {
  const type = (file.type || '').toLowerCase()
  if (/gif/.test(type) || /\.gif$/i.test(file.name || '')) return file // 动图不处理
  let img
  try {
    img = await loadImageFile(file)
  } catch (e) {
    return file // 浏览器解不开就传原图,交给后端校验
  }
  const width = img.naturalWidth
  const height = img.naturalHeight
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  if (scale === 1 && file.size <= 1024 * 1024) return file // 本来就小,不动
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // PNG 透明底转 JPEG 时填白,否则变黑
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob || blob.size >= file.size) return file // 压完反而更大就用原图
  const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = e => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

function uploadErrorText(err, file) {
  const status = err && err.status
  const message = String((err && err.message) || '')
  if (status === 413 || /413|too large|size exceeded/i.test(message)) {
    return '图片超过服务器大小限制，请压缩后重新上传'
  }
  if (status === 401 || status === 403) return '登录状态已失效，请重新登录后上传'
  if (status >= 500) return `服务器处理图片失败（HTTP ${status}），请稍后重试`
  if (/timeout|network|failed to fetch/i.test(message)) return '手机网络上传中断，请切换稳定网络后重试'
  const filename = file && file.name ? `“${file.name}”` : '图片'
  return `${filename}上传失败${status ? `（HTTP ${status}）` : ''}，请重试`
}

// el-upload 用自己的 XHR,不走 api.js 的 axios 拦截器,所以上传接口返回 401/403
// 时不会像普通请求那样自动退出登录。这里手动判定并触发,和拦截器行为保持一致,
// 避免用户停在一个看似已登录、实则每次上传都被拒的界面。
function isAuthUploadError(err) {
  const status = err && err.status
  const message = String((err && err.message) || '')
  return status === 401 || status === 403 || /\b(401|403)\b/.test(message)
}
function forceRelogin() {
  localStorage.removeItem('paitai_token')
  localStorage.removeItem('paitai_user')
  authToken.value = ''
  platforms.value = []
  accounts.value = []
  logged.value = false
  activeTab.value = 'home'
  dialogVisible.value = false
  msg.error('登录状态已失效，请重新登录')
}

async function sendCode() {
  if (!phoneValid.value) { msg.warning('请输入正确的手机号'); return }
  sending.value = true
  try {
    await authApi.sendCode(loginForm.phone, mode.value)
    msg.success('验证码已发送,5分钟内有效')
    countdown.value = 60
    cdTimer = setInterval(() => { if (--countdown.value <= 0) clearInterval(cdTimer) }, 1000)
  } catch (e) {
    msg.error(e.message || '发送失败')
  } finally {
    sending.value = false
  }
}

async function doLogin() {
  if (!phoneValid.value) { msg.warning('请输入正确的手机号'); return }
  if (loginType.value === 'code' && !/^\d{6}$/.test(loginForm.code)) { msg.warning('请输入6位验证码'); return }
  if (loginType.value === 'password' && !loginForm.password) { msg.warning('请输入密码'); return }
  loggingIn.value = true
  try {
    const data = await authApi.login({
      phone: loginForm.phone, type: loginType.value,
      code: loginForm.code, password: loginForm.password
    })
    localStorage.setItem('paitai_token', data.token)
    localStorage.setItem('paitai_user', JSON.stringify(data.user))
    authToken.value = data.token
    user.value = data.user
    logged.value = true
    if (cdTimer) clearInterval(cdTimer)
    loginForm.code = ''
    loginForm.password = ''
    msg.success('登录成功')
    load(); loadStats(); loadPlatformOptions(); loadUnreadFeedback()
  } catch (e) {
    const text = e.message || '登录失败'
    msg.error(text)
    // 后端说这个号还没注册,直接把用户带到注册页
    if (text.includes('未注册') || text.includes('用户不存在')) {
      switchMode('register')
    }
  } finally {
    loggingIn.value = false
  }
}

// 注册:手机号 + 短信验证码 + 密码,成功后回到登录页自己登录
async function doRegister() {
  if (!phoneValid.value) { msg.warning('请输入正确的手机号'); return }
  if (!/^\d{6}$/.test(loginForm.code)) { msg.warning('请输入6位验证码'); return }
  if (!loginForm.password) { msg.warning('请设置密码'); return }
  if (passwordError.value) { msg.warning(passwordError.value); return }
  if (loginForm.password !== loginForm.confirm) { msg.warning('两次输入的密码不一致'); return }
  loggingIn.value = true
  try {
    await authApi.register({
      phone: loginForm.phone,
      code: loginForm.code,
      password: loginForm.password
    })
    msg.success('注册成功,请登录')
    switchMode('login')
    loginType.value = 'password'
  } catch (e) {
    const text = e.message || '注册失败'
    msg.error(text)
    if (text.includes('已注册')) switchMode('login')
  } finally {
    loggingIn.value = false
  }
}

// 忘记密码:手机号 + 短信验证码 + 新密码,成功后回到密码登录
async function doReset() {
  if (!phoneValid.value) { msg.warning('请输入正确的手机号'); return }
  if (!/^\d{6}$/.test(loginForm.code)) { msg.warning('请输入6位验证码'); return }
  if (!loginForm.password) { msg.warning('请设置新密码'); return }
  if (passwordError.value) { msg.warning(passwordError.value); return }
  if (loginForm.password !== loginForm.confirm) { msg.warning('两次输入的密码不一致'); return }
  loggingIn.value = true
  try {
    await authApi.resetPassword({
      phone: loginForm.phone,
      code: loginForm.code,
      password: loginForm.password
    })
    msg.success('密码已重置,请用新密码登录')
    switchMode('login')
    loginType.value = 'password'
  } catch (e) {
    msg.error(e.message || '重置失败')
  } finally {
    loggingIn.value = false
  }
}

// 修改用户名
const nicknameDialog = reactive({ visible: false, value: '', saving: false })
function editNickname() {
  nicknameDialog.value = user.value.nickname || ''
  nicknameDialog.visible = true
}
async function saveNickname() {
  const value = nicknameDialog.value.trim()
  if (!value) { msg.warning('请输入用户名'); return }
  nicknameDialog.saving = true
  try {
    await authApi.setNickname(value)
    user.value = { ...user.value, nickname: value }
    localStorage.setItem('paitai_user', JSON.stringify(user.value))
    msg.success('用户名已修改')
    nicknameDialog.visible = false
  } catch (e) {
    msg.error(e.message || '修改失败')
  } finally {
    nicknameDialog.saving = false
  }
}

const newPassword = ref('')
const pwdDialogVisible = ref(false)
function openPwdDialog() {
  newPassword.value = ''
  pwdDialogVisible.value = true
}
const newPwdError = computed(() => {
  const p = newPassword.value
  if (!p) return ''
  if (p.length < 6 || p.length > 20) return '密码长度为6~20位'
  if (/^\d+$/.test(p)) return '密码不能是纯数字'
  if (/^[a-zA-Z]+$/.test(p)) return '密码不能是纯字母'
  return ''
})
async function savePassword() {
  if (!newPassword.value) { msg.warning('请输入新密码'); return }
  if (newPwdError.value) { msg.warning(newPwdError.value); return }
  try {
    await authApi.setPassword(newPassword.value)
    msg.success('密码已保存,下次可以用密码登录了')
    newPassword.value = ''
    pwdDialogVisible.value = false
    user.value = { ...user.value, hasPassword: true }
    localStorage.setItem('paitai_user', JSON.stringify(user.value))
  } catch (e) {
    msg.error(e.message || '保存失败')
  }
}

async function doLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗?', '提示', {
      confirmButtonText: '退出', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  try { await authApi.logout() } catch (e) { /* 忽略 */ }
  localStorage.removeItem('paitai_token')
  localStorage.removeItem('paitai_user')
  authToken.value = ''
  platforms.value = []
  accounts.value = []
  logged.value = false
  activeTab.value = 'home'
  msg.success('已退出登录')
}

// ---------- 管理员:用户管理 ----------
const adminVisible = ref(false)
const adminRows = ref([])
const adminTotal = ref(0)
const adminQuery = reactive({ current: 1, size: 10, phone: '' })

function openAdmin() {
  adminVisible.value = true
  loadUsers()
}
function searchUsers() { adminQuery.current = 1; loadUsers() }
async function loadUsers() {
  try {
    const page = await adminApi.users(adminQuery)
    adminRows.value = page.records
    adminTotal.value = page.total
  } catch (e) {
    msg.error(e.message || '加载用户失败')
  }
}
async function toggleStatus(row) {
  try {
    await adminApi.setStatus(row.id, row.status === 1 ? 0 : 1)
    msg.success(row.status === 1 ? '已禁用,该用户将无法登录' : '已启用')
    loadUsers()
  } catch (e) {
    msg.error(e.message || '操作失败')
  }
}
function resetPwd(row) {
  ElMessageBox.prompt(`给 ${row.phone} 设置新密码(至少6位)`, '重置密码', {
    inputType: 'password', confirmButtonText: '确定', cancelButtonText: '取消'
  }).then(async ({ value }) => {
    await adminApi.resetPassword(row.id, value)
    msg.success('密码已重置')
  }).catch(e => { if (e !== 'cancel' && e && e.message) msg.error(e.message) })
}
async function removeUser(row) {
  try {
    await adminApi.remove(row.id)
    msg.success('已删除该用户及其记录')
    loadUsers()
  } catch (e) {
    msg.error(e.message || '删除失败')
  }
}

// ---------- 头像 ----------
const avatarView = ref(false)
// 头像/反馈上传用独立的错误处理,避免误改编辑表单的 fileList/form.images
function onAvatarErr(err, file) {
  if (isAuthUploadError(err)) { forceRelogin(); return }
  msg.error(uploadErrorText(err, file))
}
// 保存头像图片到本地(同源图片,fetch 成 blob 后触发下载)
async function saveAvatarImage() {
  if (!user.value.avatar) return
  try {
    const resp = await fetch(displaySrc(user.value.avatar))
    const blob = await resp.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = user.value.avatar.split('/').pop() || 'avatar.jpg'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
    msg.success('已保存图片')
  } catch (e) {
    msg.error('保存失败,可长按图片另存')
  }
}
async function onAvatarOk(res) {
  if (res.code !== 200) { msg.error(res.msg || '头像上传失败'); return }
  try {
    await authApi.setAvatar(res.data)
    user.value = { ...user.value, avatar: res.data }
    localStorage.setItem('paitai_user', JSON.stringify(user.value))
    msg.success('头像已更新')
  } catch (e) {
    msg.error(e.message || '头像设置失败')
  }
}

// ---------- 意见反馈 ----------
const fbImgs = fb => storageUrls(fb.images)
// 用户端
const fbVisible = ref(false)
const fbContent = ref('')
const fbFileList = ref([])
const fbImages = ref('')
const fbSubmitting = ref(false)
const fbMine = ref([])
function syncFbImages() {
  fbImages.value = fbFileList.value.map(f => f.storageUrl || f.url)
    .filter(u => u && !u.startsWith('blob:')).join(',')
}
function onFbUploadOk(res, file) {
  if (res.code !== 200) {
    msg.error(res.msg || '上传失败')
    fbFileList.value = fbFileList.value.filter(f => f.uid !== file.uid)
    return
  }
  file.storageUrl = res.data
  file.url = res.data
  syncFbImages()
}
function onFbPreview(file) {
  const urls = fbFileList.value.map(f => f.storageUrl).filter(Boolean)
  openImagePreview(urls, Math.max(0, urls.indexOf(file.storageUrl)))
}
function onFbUploadErr(err, file) {
  fbFileList.value = fbFileList.value.filter(f => f.uid !== file.uid)
  syncFbImages()
  if (isAuthUploadError(err)) { forceRelogin(); return }
  msg.error(uploadErrorText(err, file))
}
async function openFeedback() {
  fbVisible.value = true
  fbContent.value = ''
  fbFileList.value = []
  fbImages.value = ''
  try { fbMine.value = await feedbackApi.mine() } catch (e) { fbMine.value = [] }
}
async function submitFeedback() {
  if (fbFileList.value.some(f => f.status === 'uploading')) {
    msg.warning('图片还在上传中,请稍候'); return
  }
  if (!fbContent.value.trim()) { msg.warning('请填写反馈内容'); return }
  fbSubmitting.value = true
  try {
    syncFbImages()
    await feedbackApi.submit(fbContent.value.trim(), fbImages.value)
    msg.success('反馈已提交,感谢你的建议')
    fbContent.value = ''
    fbFileList.value = []
    fbImages.value = ''
    fbMine.value = await feedbackApi.mine()
  } catch (e) {
    msg.error(e.message || '提交失败')
  } finally {
    fbSubmitting.value = false
  }
}

// 管理员端
const adminFbVisible = ref(false)
const adminFbRows = ref([])
const adminFbTotal = ref(0)
const adminFbQuery = reactive({ current: 1, size: 10, replied: null })
const fbReplyText = reactive({})
const fbReplying = ref(null)
const feedbackUnread = ref(0)
async function openAdminFeedback() {
  adminFbVisible.value = true
  adminFbQuery.current = 1
  await loadFeedback()
}
async function loadFeedback() {
  try {
    const params = { current: adminFbQuery.current, size: adminFbQuery.size }
    if (adminFbQuery.replied !== null) params.replied = adminFbQuery.replied
    const page = await feedbackApi.list(params)
    adminFbRows.value = page.records
    adminFbTotal.value = page.total
    page.records.forEach(fb => { if (fb.replied) fbReplyText[fb.id] = fb.reply })
  } catch (e) {
    msg.error(e.message || '加载反馈失败')
  }
}
async function replyFeedback(fb) {
  const text = (fbReplyText[fb.id] || '').trim()
  if (!text) { msg.warning('请输入回复内容'); return }
  fbReplying.value = fb.id
  try {
    await feedbackApi.reply(fb.id, text)
    msg.success('回复成功')
    await loadFeedback()
    loadUnreadFeedback()
  } catch (e) {
    msg.error(e.message || '回复失败')
  } finally {
    fbReplying.value = null
  }
}
async function loadUnreadFeedback() {
  if (user.value.role !== 'admin') return
  try { feedbackUnread.value = await feedbackApi.unreplied() } catch (e) { /* 忽略 */ }
}

const statsOpen = ref(false)
const filtersOpen = ref(false)
// 超级管理员只读:不展示统计数据、记一笔、编辑/删除,只能查看数据
const isAdmin = computed(() => user.value.role === 'admin')
const isMobile = ref(window.innerWidth < 768)
const onResize = () => { isMobile.value = window.innerWidth < 768 }

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const stats = ref({})
const queryMonth = ref('')
const query = reactive({
  current: 1, size: 10,
  itemName: '', platform: '', status: '', taskType: '', costBack: null,
  received: null, shot: null, commissionBack: null
})

function storageUrls(csv) {
  return (csv || '').split(',').map(v => v.trim()).filter(Boolean)
}

// ---------- 图片显示:直接用 /upload 路径,由 nginx 直连服务 ----------
// 之前那套“带 token 取图转 blob”的方案在移动端反复出现加载失败/闪一下就没了,
// 已彻底移除。图片文件名是 32 位随机串、内容也不敏感,直连可接受,换来简单可靠。
function displaySrc(storageUrl) {
  return storageUrl || ''
}

// 构造 el-upload 的已有文件列表,url 直接用图片路径(同源,浏览器向 nginx 请求)
function buildFileList(csv) {
  return storageUrls(csv).map(storageUrl => ({
    name: storageUrl.split('/').pop() || storageUrl,
    storageUrl,
    url: storageUrl
  }))
}

async function load() {
  loading.value = true

  try {
    const params = { ...query }

    // 按月筛选
    if (queryMonth.value) {
      const [year, month] = queryMonth.value.split('-')

      // 当月第一天
      params.startDate = `${year}-${month}-01`

      // 当月最后一天
      const lastDay = new Date(
          Number(year),
          Number(month),
          0
      ).getDate()

      params.endDate =
          `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    }

    const page = await recordApi.page(params)

    rows.value = page.records
    total.value = page.total
  } catch (e) {
    msg.error(e.message || '加载失败,请检查后端是否启动')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try { stats.value = await recordApi.stats() } catch (e) { /* 忽略 */ }
}

function search() { query.current = 1; load() }
// 翻页后回到顶部,避免停留在旧滚动位置露出空白
async function onPageChange() {
  await load()
  const el = document.querySelector('.page.has-tabbar')
  if (el) el.scrollTop = 0
  window.scrollTo({ top: 0 })
}
function reset() {
  Object.assign(query, {
    current: 1,
    itemName: '',
    platform: '',
    status: '',
    taskType: '',
    costBack: null,
    received: null,
    shot: null,
    commissionBack: null
  })

  queryMonth.value = ''

  load()
}

// 点击统计卡片:清空其它筛选条件,只按该统计项对应的条件筛选,并把列表滚动到可见位置
function filterByStat(overrides) {
  Object.assign(
      query,
      {
        current: 1,
        itemName: '',
        platform: '',
        status: '',
        taskType: '',
        costBack: null,
        received: null,
        shot: null,
        commissionBack: null
      },
      overrides
  )

  queryMonth.value = ''

  load()

  nextTick(() => {
    const el = document.querySelector('.card-list, .ledger')
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  })
}

// ---------- 新增/编辑 ----------
const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref()
const fileList = ref([])
const recordExtractInput = ref()
const recordExtract = reactive({ loading: false, fileName: '' })
const emptyForm = () => ({
  id: null, recordDate: new Date().toISOString().slice(0, 10), itemName: '',
  cost: null, costBack: 0, taskType: '送拍', commission: null, settled: 0,
  gift: '', deposit: null, expressFeeType: '', expressFee: null,
  expressCompany: '', expressNo: '', received: 0,
  shot: 0, commissionBack: 0,
  platform: '', platformGroup: '', platformAccount: '', account: '', shopAccount: '',
  orderNo: '', requirement: '',
  status: '进行中', remark: '', images: '', sampleImages: '', reviewImages: '', orderImages: ''
})
const form = reactive(emptyForm())
const reviewList = ref([])
const orderList = ref([])
// 订单号可以有多个,界面上一行一个,存库时还是一个逗号分隔的字符串
const orderNos = ref([''])
const MAX_ORDER_NO = 10
function syncOrderNos() {
  form.orderNo = orderNos.value.map(v => (v || '').trim()).filter(Boolean).join(',')
}
function addOrderNo() {
  if (orderNos.value.length >= MAX_ORDER_NO) {
    msg.warning(`最多添加 ${MAX_ORDER_NO} 个订单号`)
    return
  }
  orderNos.value.push('')
}
function removeOrderNo(index) {
  orderNos.value.splice(index, 1)
  if (!orderNos.value.length) orderNos.value = ['']
  syncOrderNos()
}
function resetOrderNos(csv) {
  const list = (csv || '').split(',').map(v => v.trim()).filter(Boolean)
  orderNos.value = list.length ? list : ['']
}
const rules = computed(() => ({
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  itemName: [{ required: true, message: '请填写商品名', trigger: 'blur' }],
  cost: [{ required: true, message: '请填写商品价格', trigger: 'blur' }],
  costBack: [{ required: true, message: '请选择本金是否已返', trigger: 'change' }],
  taskType: [{ required: true, message: '请选择类型', trigger: 'change' }],
  platform: [{ required: true, message: '请选择接单平台', trigger: 'change' }],
  account: [{ required: true, message: '请选择下单平台', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  requirement: [{ required: true, message: '请填写出图要求', trigger: 'blur' }],
  images: [{ required: true, message: '请上传图片', trigger: 'change' }]
  // 接单账号/下单账号从数据字典里选,和订单号、截图一样都是选填
  // 快递公司/快递单号为选填(任何状态都可填,填了详情里可查物流)
}))

async function openDialog(row) {
  Object.assign(
      form,
      emptyForm(),
      row ? JSON.parse(JSON.stringify(row)) : {}
  )

  fileList.value = []
  resetOrderNos(form.orderNo)
  reviewList.value = buildFileList(form.reviewImages)
  orderList.value = buildFileList(form.orderImages)
  pasteText.value = ''
  recordExtract.fileName = ''
  dialogVisible.value = true
  if (form.images) fileList.value = await buildFileList(form.images)
}

// ---------- 评价截图 / 订单截图:和主图同一套上传逻辑,只是存到不同字段 ----------
// 只按字段名找列表:模板里直接传 ref 会被解包成数组,函数里再取 .value 就成了 undefined
const shotLists = { reviewImages: reviewList, orderImages: orderList }
function syncShots(key) {
  // blob: 是浏览器临时预览地址,说明还没传成功,绝不能存进数据库
  form[key] = shotLists[key].value.map(f => f.storageUrl || f.url)
    .filter(u => u && !u.startsWith('blob:')).join(',')
}
function onShotOk(res, file, key) {
  const list = shotLists[key]
  if (res.code !== 200) {
    msg.error(res.msg || '上传失败')
    list.value = list.value.filter(f => f.uid !== file.uid)
    return
  }
  file.storageUrl = res.data
  file.url = res.data
  syncShots(key)
}
function onShotErr(err, file, key) {
  const list = shotLists[key]
  list.value = list.value.filter(f => f.uid !== file.uid)
  syncShots(key)
  if (isAuthUploadError(err)) { forceRelogin(); return }
  msg.error(uploadErrorText(err, file))
}
function onShotPreview(file, key) {
  const urls = shotLists[key].value.map(f => f.storageUrl || f.url).filter(Boolean)
  openImagePreview(urls, Math.max(0, urls.indexOf(file.storageUrl || file.url)))
}

// ---------- AI 修图助手(后端调通义千问图像编辑) ----------
const AI_EDIT_PRESETS = [
  { label: '白底图', prompt: '把背景换成纯白色,商品本身保持不变,光线自然' },
  { label: '去水印', prompt: '去掉图片上的水印、文字和 logo,其余内容保持不变' },
  { label: '去杂物', prompt: '去掉背景里的杂物,让画面干净整洁,商品保持不变' }
  // 原来还有「提亮调色」「高级背景」,这两个会让模型大面积重画,出的图容易被平台内容审核拦掉,去掉了
]
// 出图分辨率跟着原图走,长边 1280 对商品图够清楚,比 2048 快很多
const AI_IMAGE_EDGE = 1280
const aiFileInput = ref()
const aiEdit = reactive({
  visible: false, file: null, srcUrl: '', prompt: '', loading: false, result: '',
  // 失败原因留在弹窗里,不用一闪而过的 toast:修一张要等一两分钟,提示看不见等于白等
  error: ''
})
// 被平台内容审核拦下来的,多试一次常常就过了,额外给几句话
const aiEditModerated = computed(() => /审核/.test(aiEdit.error))
// 修一张要一两分钟,转圈不报时的话用户不知道是在跑还是卡死了
const aiElapsed = ref(0)
let aiTimer = null
const aiLoadingText = computed(() => {
  const s = aiElapsed.value
  const clock = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  if (s < 90) return `正在修图 ${clock},一般一两分钟…`
  return `正在修图 ${clock},这张有点费劲,再等等…`
})
function startAiTimer() {
  aiElapsed.value = 0
  clearInterval(aiTimer)
  aiTimer = setInterval(() => { aiElapsed.value += 1 }, 1000)
}
function stopAiTimer() {
  clearInterval(aiTimer)
  aiTimer = null
}

function openAiEdit() {
  aiEdit.visible = true
}

function resetAiEdit() {
  if (aiEdit.srcUrl) URL.revokeObjectURL(aiEdit.srcUrl)
  Object.assign(aiEdit, { file: null, srcUrl: '', prompt: '', loading: false, result: '', error: '' })
}

async function onAiFilePick(e) {
  const picked = e.target.files && e.target.files[0]
  e.target.value = '' // 允许重复选同一张
  if (!picked) return
  if (/gif/i.test(picked.type) || /\.gif$/i.test(picked.name || '')) {
    msg.error('AI 修图不支持 GIF,请选 JPG、PNG、WEBP 图片')
    return
  }
  // 复用上传前的格式/大小校验和压缩;AI 修图的图压得更小,上传和出图都快不少
  const file = await beforeImageUpload(picked, AI_IMAGE_EDGE)
  if (!file) return
  if (aiEdit.srcUrl) URL.revokeObjectURL(aiEdit.srcUrl)
  aiEdit.file = file
  aiEdit.srcUrl = URL.createObjectURL(file)
  aiEdit.result = ''
  aiEdit.error = ''
}

async function runAiEdit() {
  if (!aiEdit.file) { msg.warning('请先选一张图片'); aiFileInput.value.click(); return }
  if (!aiEdit.prompt.trim()) { msg.warning('请选一个修图方式,或写一下想怎么修'); return }
  aiEdit.loading = true
  aiEdit.error = ''
  startAiTimer()
  try {
    const jobId = await aiApi.imageEdit(aiEdit.file, aiEdit.prompt.trim())
    aiEdit.result = await waitAiEdit(jobId)
    msg.success('修好了')
  } catch (e) {
    aiEdit.error = e.message || 'AI 修图失败,请稍后重试'
    msg.error(aiEdit.error)
  } finally {
    stopAiTimer()
    aiEdit.loading = false
  }
}

// 每 1.5 秒问一次后端修好没;单次查询网络抖一下不算失败,接着问。
// 上限要比后端 qwen.timeout-seconds(默认 420 秒)大,不然后端还在出图、前端先放弃了,
// 那样用户看到的是没头没脑的「等太久」,而不是后端那句具体原因
async function waitAiEdit(jobId) {
  const deadline = Date.now() + 8 * 60 * 1000
  let lastError = null
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    let job
    try {
      job = await aiApi.imageEditResult(jobId)
    } catch (e) {
      if (/不存在或已过期/.test(e.message || '')) throw e
      lastError = e
      continue
    }
    if (job.status === 'done') return job.path
    if (job.status === 'failed') throw new Error(job.msg || 'AI 修图失败,请稍后重试')
  }
  throw new Error(lastError ? lastError.message : '修图等太久了,请稍后重试')
}

// 修好的图已经存在自己的上传目录里,直接带进「记一笔」当记录图片
async function useAiResult() {
  const path = aiEdit.result
  aiEdit.visible = false
  await openDialog()
  fileList.value = buildFileList(path)
  syncImages()
}

// ---------- 详情 + 样例图片 ----------
const detailVisible = ref(false)
const detail = ref({})
const sampleList = ref([])

async function openDetail(row) {
  detail.value = JSON.parse(JSON.stringify(row))
  sampleList.value = []
  express.loading = false
  express.queried = false
  express.result = null
  detailVisible.value = true
  sampleList.value = await buildFileList(row.sampleImages)
}

// 详情里的订单号:存的是逗号分隔,展示时拆开,一个一格
const detailOrderNos = computed(() =>
  (detail.value.orderNo || '').split(',').map(v => v.trim()).filter(Boolean))

// 详情里要展示的截图分组:没传过的那组不显示
const detailShotGroups = computed(() => [
  { title: '评价截图', urls: storageUrls(detail.value.reviewImages) },
  { title: '订单截图', urls: storageUrls(detail.value.orderImages) }
].filter(g => g.urls.length))

// 复制订单号:手机浏览器不给 clipboard 权限时退回临时 input + execCommand
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    msg.success('已复制')
    return
  } catch (e) { /* 不支持或没权限,走兜底 */ }
  const input = document.createElement('input')
  input.value = text
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(input)
  msg[ok ? 'success' : 'warning'](ok ? '已复制' : '复制失败,请长按选中复制')
}

// ---------- 快递查询(详情弹窗内) ----------
const express = reactive({ loading: false, queried: false, result: null })
// 状态文字 -> el-tag 颜色
const expressTagType = t => ({
  '已签收': 'success', '已揽收': 'primary', '运输中': 'primary', '派送中': 'warning',
  '疑难件': 'danger', '已退签': 'danger', '退回中': 'danger', '已转投': 'info'
}[t] || 'info')

function resetExpress() {
  express.loading = false
  express.queried = false
  express.result = null
}

// 详情弹窗内的内联查询(目标=当前详情记录)
function queryExpress() {
  return runExpressQuery(detail.value.expressNo, detail.value.expressCompany)
}

async function runExpressQuery(no, company) {
  if (!no) {
    msg.warning('这条记录没有寄回快递单号')
    return
  }
  // 顺丰必须提供收/寄件人手机号后四位才能查
  let phone = ''
  if (company === '顺丰') {
    try {
      const r = await ElMessageBox.prompt('顺丰需要收/寄件人手机号后四位才能查询', '顺丰快递', {
        inputPattern: /^\d{4}$/, inputPlaceholder: '手机号后四位',
        inputErrorMessage: '请输入4位数字', confirmButtonText: '查询', cancelButtonText: '取消'
      })
      phone = r.value
    } catch {
      return // 取消
    }
  }
  express.loading = true
  express.queried = true
  try {
    express.result = await expressApi.query(no, company || '', phone)
    if (express.result && !express.result.success && express.result.message) {
      msg.info(express.result.message)
    }
  } catch (e) {
    express.result = null
    msg.error(e.message || '查询快递失败')
  } finally {
    express.loading = false
  }
}

// 样例图上传/删除后立即保存(发送完整记录,避免误清其他字段)
async function saveSamples() {
  detail.value.sampleImages = sampleList.value.map(f => f.storageUrl || f.url)
    .filter(u => u && !u.startsWith('blob:')).join(',')
  try {
    await recordApi.update(detail.value)
    msg.success('样例已保存')
    load()
  } catch (e) {
    msg.error(e.message || '样例保存失败')
  }
}
function onSampleOk(res, file) {
  if (res.code !== 200) {
    msg.error(res.msg || '上传失败')
    sampleList.value = sampleList.value.filter(f => f.uid !== file.uid)
    return
  }
  file.storageUrl = res.data
  file.url = res.data
  saveSamples()
}
function onSampleRemove(file, files) {
  // 删除回调触发时 v-model 可能还没同步,以 Element 传来的"删除后列表"为准
  sampleList.value = files
  saveSamples()
}
function onSampleErr(err, file) {
  sampleList.value = sampleList.value.filter(f => f.uid !== file.uid)
  if (isAuthUploadError(err)) { forceRelogin(); return }
  msg.error(uploadErrorText(err, file))
}

// 点击样例缩略图 → 全屏预览,可左右切换
const previewVisible = ref(false)
const previewUrls = ref([])
const previewIndex = ref(0)

// ---- 缩放/平移状态 ----
const ivScale = ref(1)
const ivTx = ref(0)
const ivTy = ref(0)
const IV_MIN = 1
const IV_MAX = 6
const ivImgStyle = computed(() => ({
  transform: `translate(${ivTx.value}px, ${ivTy.value}px) scale(${ivScale.value})`,
  cursor: ivScale.value > 1 ? 'grab' : 'default'
}))
const ivStage = ref(null)
const clampScale = s => Math.min(IV_MAX, Math.max(IV_MIN, s))
function resetZoom() { ivScale.value = 1; ivTx.value = 0; ivTy.value = 0 }

// 以 (clientX, clientY) 为锚点缩放到 target:该点在屏幕上保持不动
function zoomAt(target, clientX, clientY) {
  const next = clampScale(target)
  const el = ivStage.value
  if (!el) { ivScale.value = next; return }
  const rect = el.getBoundingClientRect()
  // 锚点相对 stage 中心的偏移(未变换图片中心即位于 stage 中心)
  const ax = clientX - (rect.left + rect.width / 2)
  const ay = clientY - (rect.top + rect.height / 2)
  const ratio = next / ivScale.value
  ivTx.value = ax - ratio * (ax - ivTx.value)
  ivTy.value = ay - ratio * (ay - ivTy.value)
  ivScale.value = next
  if (next === 1) { ivTx.value = 0; ivTy.value = 0 }
}

function toggleZoom(e) {
  if (ivScale.value > 1) resetZoom()
  else zoomAt(2.5, e.clientX, e.clientY)
}

// 桌面:滚轮以光标为中心缩放
function onWheel(e) {
  zoomAt(ivScale.value + (e.deltaY > 0 ? -0.25 : 0.25), e.clientX, e.clientY)
}

// 手机:双指以两指中点为中心缩放 + 单指平移
let pinchDist = 0, pinchScale = 1, lastX = 0, lastY = 0
const touchDist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
const touchMid = t => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 })
let swipeStartX = 0, swipeStartY = 0, gesturePinched = false
function onTouchStart(e) {
  if (e.touches.length === 2) {
    gesturePinched = true
    pinchDist = touchDist(e.touches); pinchScale = ivScale.value
  } else if (e.touches.length === 1) {
    gesturePinched = false
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY
    swipeStartX = e.touches[0].clientX; swipeStartY = e.touches[0].clientY
  }
}
function onTouchMove(e) {
  if (e.touches.length === 2) {
    gesturePinched = true
    const mid = touchMid(e.touches)
    zoomAt(pinchScale * touchDist(e.touches) / (pinchDist || 1), mid.x, mid.y)
  } else if (e.touches.length === 1 && ivScale.value > 1) {
    ivTx.value += e.touches[0].clientX - lastX
    ivTy.value += e.touches[0].clientY - lastY
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY
  }
}
function onTouchEnd(e) {
  if (e.touches.length > 0) return // 还有手指没抬起(如捏合中松开一根)
  // 未缩放、非捏合手势时:横向滑动切换上/下一张
  if (!gesturePinched && ivScale.value === 1 && e.changedTouches.length) {
    const dx = e.changedTouches[0].clientX - swipeStartX
    const dy = e.changedTouches[0].clientY - swipeStartY
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      stepImg(dx < 0 ? 1 : -1)
    }
  }
  gesturePinched = false
  if (ivScale.value === 1) { ivTx.value = 0; ivTy.value = 0 }
}

// 桌面:放大后按住拖动平移
let dragging = false, dragX = 0, dragY = 0
function onMouseDown(e) {
  if (ivScale.value <= 1) return
  dragging = true; dragX = e.clientX - ivTx.value; dragY = e.clientY - ivTy.value
}
function onMouseMove(e) {
  if (!dragging) return
  ivTx.value = e.clientX - dragX; ivTy.value = e.clientY - dragY
}
function endDrag() { dragging = false }

// 切换图片(切换时重置缩放)
function stepImg(dir) {
  const n = previewUrls.value.length
  if (n < 2) return
  previewIndex.value = (previewIndex.value + dir + n) % n
  resetZoom()
}

function onViewerKey(e) {
  if (!previewVisible.value) return
  if (e.key === 'Escape') closePreview()
  else if (e.key === 'ArrowLeft') stepImg(-1)
  else if (e.key === 'ArrowRight') stepImg(1)
}

function openImagePreview(storageList, index = 0) {
  const urls = storageList.filter(Boolean)
  if (!urls.length) return
  previewUrls.value = urls
  previewIndex.value = Math.max(0, Math.min(index, urls.length - 1))
  resetZoom()
  previewVisible.value = true
}

function closePreview() {
  previewVisible.value = false
  previewUrls.value = []
  resetZoom()
}

function onRecordImagePreview(row, index = 0) {
  openImagePreview(storageUrls(row.images), index)
}

function onSamplePreview(file) {
  const urls = sampleList.value.map(f => f.storageUrl).filter(Boolean)
  openImagePreview(urls, Math.max(0, urls.indexOf(file.storageUrl)))
}
// 编辑/新增弹窗里的图片点击预览
function onImagePreview(file) {
  const urls = fileList.value.map(f => f.storageUrl).filter(Boolean)
  openImagePreview(urls, Math.max(0, urls.indexOf(file.storageUrl)))
}

// ---------- 商品/任务截图识别 ----------
function pickRecordExtract() {
  if (!recordExtract.loading) recordExtractInput.value?.click()
}

async function onRecordExtractPick(e) {
  const input = e.target
  const file = input.files && input.files[0]
  input.value = '' // 识别失败后仍允许再次选择同一张图
  if (!file) return
  if (/gif/i.test(file.type || '') || /\.gif$/i.test(file.name || '')) {
    msg.error('图片识别仅支持 JPG、PNG、WEBP')
    return
  }

  const prepared = await beforeImageUpload(file, 2200)
  if (!prepared) return
  recordExtract.loading = true
  recordExtract.fileName = `正在识别：${file.name || '所选截图'}`
  try {
    const result = await aiApi.recordExtract(prepared)
    const matched = []
    const itemName = String(result?.itemName || '').trim()
    const requirement = String(result?.requirement || '').trim()
    const remark = String(result?.remark || '').trim()
    const cost = result?.cost == null || result.cost === '' ? null : Number(result.cost)

    if (itemName) { form.itemName = itemName; matched.push('商品名') }
    if (Number.isFinite(cost) && cost >= 0) { form.cost = cost; matched.push('商品价格') }
    if (requirement) { form.requirement = requirement; matched.push('出图要求') }
    if (remark) { form.remark = remark; matched.push('备注') }

    recordExtract.fileName = matched.length
      ? `已识别：${matched.join('、')}`
      : '这张图里没有识别到可填内容'
    if (!matched.length) {
      msg.warning('没有识别到商品或任务信息，请换一张更清晰的截图')
      return
    }
    formRef.value?.clearValidate(['itemName', 'cost', 'requirement'])
    msg.success(`已从截图填充：${matched.join('、')}`)
  } catch (err) {
    recordExtract.fileName = '识别失败，可重新选择截图'
    msg.error(err.message || '图片识别失败，请重试')
  } finally {
    recordExtract.loading = false
  }
}

// ---------- 粘贴识别 ----------
const pasteText = ref('')
function onPaste(e) {
  pasteText.value = (e.clipboardData || window.clipboardData).getData('text')
  applyParse()
}
function applyParse() {
  const { fields, matched } = parseRecord(pasteText.value)
  if (!matched.length) {
    msg.warning('没识别出内容,请手动填写')
    return
  }
  Object.assign(form, fields)
  msg.success(`已识别填充:${matched.join('、')}`)
}

function syncImages() {
  // blob: 是浏览器临时预览地址,说明还没传成功,绝不能存进数据库
  form.images = fileList.value.map(f => f.storageUrl || f.url)
    .filter(u => u && !u.startsWith('blob:')).join(',')
}
function onUploadOk(res, file) {
  if (res.code !== 200) {
    msg.error(res.msg || '上传失败')
    fileList.value = fileList.value.filter(f => f.uid !== file.uid)
    return
  }
  file.storageUrl = res.data
  file.url = res.data
  syncImages()
}
function onUploadErr(err, file) {
  fileList.value = fileList.value.filter(f => f.uid !== file.uid)
  syncImages()
  if (isAuthUploadError(err)) { forceRelogin(); return }
  msg.error(uploadErrorText(err, file))
}

async function submit() {
  const uploading = f => f.status === 'uploading' || (!f.storageUrl && (f.url || '').startsWith('blob:'))
  if ([fileList, reviewList, orderList].some(list => list.value.some(uploading))) {
    msg.warning('图片还在上传中,请等缩略图上传完成后再保存')
    return
  }
  await formRef.value.validate()
  saving.value = true
  try {
    syncImages()
    // 快递公司/单号任何状态都可保存;快递费仍只属于"已寄回"
    if (form.status !== '已寄回') {
      form.expressFeeType = ''
      form.expressFee = null
    }
    if (form.taskType !== '寄拍') {
      form.commission = null
      form.commissionBack = 0
    }
    syncOrderNos()
    syncShots('reviewImages')
    syncShots('orderImages')
    // 没选平台就不该留着账号/群/订单号
    if (!form.platform) { form.platformAccount = ''; form.platformGroup = '' }
    if (!form.account) { form.shopAccount = ''; form.orderNo = '' }
    if (form.id) await recordApi.update(form)
    else await recordApi.save(form)
    msg.success('已保存')
    dialogVisible.value = false
    load(); loadStats()
  } catch (e) {
    msg.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  try {
    await recordApi.remove(id)
    msg.success('已删除')
    load(); loadStats()
  } catch (e) {
    msg.error(e.message || '删除失败')
  }
}

// ---------- 工具 ----------
const fmt = v => v == null ? '-' : Number(v).toFixed(2)
const imgList = row => storageUrls(row.images)
const statusColor = s => ({
  '已完成': 'success', '等返款': 'warning', '等审核': 'danger',
  '已寄回': 'info', '进行中': 'primary'
}[s] || 'info')

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onViewerKey)
  // 被顶下线/登录失效后回到登录页,给出一次性提示
  const notice = localStorage.getItem('paitai_login_notice')
  if (notice) {
    localStorage.removeItem('paitai_login_notice')
    msg.warning(notice)
  }
  if (logged.value) {
    load(); loadStats(); loadPlatformOptions(); loadUnreadFeedback()
    // 顺便刷新用户信息;token 失效会触发 401 自动回登录页
    authApi.me().then(u => {
      user.value = u
      localStorage.setItem('paitai_user', JSON.stringify(u))
      loadUnreadFeedback()
    }).catch(() => { /* 401 已由拦截器处理 */ })
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onViewerKey)
  stopAiTimer()
})

// ---------- 手机端弹窗打开时锁死底层内容区,防止滚动穿透 ----------
let savedScrollTop = 0
watch([dialogVisible, detailVisible, () => aiEdit.visible], ([editOpen, detailOpen, aiOpen]) => {
  if (!isMobile.value) return
  const el = document.querySelector('.page.has-tabbar')
  if (!el) return
  if (editOpen || detailOpen || aiOpen) {
    savedScrollTop = el.scrollTop
    el.style.overflow = 'hidden'
  } else {
    el.style.overflow = ''
    el.scrollTop = savedScrollTop
  }
})
</script>

<style>
:root {
  --el-color-primary: #2f6d5a;
  /* 派生色:不补的话按钮 hover/点击会回退成默认蓝 */
  --el-color-primary-light-3: #6d998c;
  --el-color-primary-light-5: #97b6ad;
  --el-color-primary-light-7: #c1d3ce;
  --el-color-primary-light-8: #d5e2de;
  --el-color-primary-light-9: #eaf0ef;
  --el-color-primary-dark-2: #265748;
  --ink: #22302b;
  --muted: #8a938f;
  --paper: #f4f6f4;
  --line: #e9ece7;
  --brand-grad: linear-gradient(135deg, #3a8570, #275e4d);
  --card-radius: 14px;
  --shadow-sm: 0 1px 2px rgba(31, 63, 52, .05);
  --shadow-md: 0 6px 20px rgba(31, 63, 52, .07);
  --shadow-lg: 0 16px 40px rgba(31, 63, 52, .12);
  --el-border-radius-base: 10px;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

.page { max-width: 1280px; margin: 0 auto; padding: 20px 24px 48px; }
.page.has-tabbar { padding-bottom: 90px; }

/* 登录页 */
.login-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background:
    radial-gradient(1100px 520px at 15% -10%, rgba(58, 133, 112, .18), transparent 60%),
    radial-gradient(900px 480px at 110% 115%, rgba(39, 94, 77, .16), transparent 60%),
    var(--paper);
}
.login-card {
  width: 100%; max-width: 390px; background: #fff;
  border: 1px solid var(--line); border-radius: 20px; padding: 36px 30px 30px;
  box-shadow: var(--shadow-lg);
}
.login-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
.login-brand .brand-mark { width: 52px; height: 52px; font-size: 27px; border-radius: 15px; }
.login-brand-text h1 { margin: 0; font-size: 22px; letter-spacing: 3px; }
.login-brand-text p { margin: 4px 0 0; font-size: 12px; color: var(--muted); letter-spacing: .5px; }
.login-tabs { display: flex; gap: 26px; margin-bottom: 20px; font-size: 15px; }
.login-tabs span { color: var(--muted); cursor: pointer; padding-bottom: 8px; position: relative; transition: color .2s; }
.login-tabs span.active {
  color: var(--el-color-primary); font-weight: 700;
}
.login-tabs span.active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2.5px;
  border-radius: 2px; background: var(--el-color-primary);
}
.login-input { margin-bottom: 14px; }
.code-row { display: flex; gap: 10px; margin-bottom: 14px; }
.code-row .el-button { width: 116px; }
.login-forgot { text-align: right; margin: -4px 0 12px; }
.login-forgot a { color: var(--muted); font-size: 13px; cursor: pointer; transition: color .2s; }
.login-forgot a:hover { color: var(--el-color-primary); }
.login-btn { width: 100%; margin-top: 6px; margin-left: 0; height: 46px; font-size: 16px; letter-spacing: 3px; font-weight: 600; }
.login-switch { text-align: center; margin-top: 18px; font-size: 13px; color: var(--muted); }
.login-switch a { color: var(--el-color-primary); cursor: pointer; font-weight: 600; }
.field-tip { font-size: 12px; line-height: 1.4; margin: -8px 0 10px 2px; }
.field-tip.err { color: #c0392b; }

/* 底部导航 */
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 100;
  display: flex; background: rgba(255, 255, 255, .92); backdrop-filter: blur(10px);
  border-top: 1px solid var(--line); box-shadow: 0 -2px 16px rgba(31, 63, 52, .05);
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 9px 0 7px; font-size: 12px; color: var(--muted); cursor: pointer; user-select: none;
  transition: color .2s;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.tab-item.active { color: var(--el-color-primary); font-weight: 600; }
.tab-ico { width: 24px; height: 24px; display: block; }
.upload-ico { color: var(--muted); }

/* 我的 */
.mine { max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
.mine-card { background: #fff; border: 1px solid var(--line); border-radius: var(--card-radius); padding: 18px; box-shadow: var(--shadow-sm); }
.mine-head {
  display: flex; align-items: center; gap: 15px; color: #fff; border: none;
  background: var(--brand-grad); box-shadow: var(--shadow-md);
}
.mine-head .brand-mark {
  background: rgba(255, 255, 255, .18); box-shadow: none;
  backdrop-filter: blur(2px);
}
.mine-name { font-size: 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.name-edit-ico { color: rgba(255, 255, 255, .85); cursor: pointer; flex: 0 0 auto; }
.name-edit-ico:hover { color: #fff; }
.btn-ico { vertical-align: -2px; margin-right: 4px; }
.mine-phone { font-size: 13px; color: rgba(255, 255, 255, .82); margin-top: 3px; }
.mine-row {
  display: flex; justify-content: space-between; padding: 11px 0;
  font-size: 14px; border-bottom: 1px solid var(--line);
}
.mine-row:last-child { border-bottom: none; }
.mine-row span:first-child { color: var(--muted); }
.mine-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.admin-bar { display: flex; gap: 10px; margin-bottom: 12px; }
.admin-list { display: flex; flex-direction: column; gap: 10px; }
.admin-card { border: 1px solid var(--line); border-radius: var(--card-radius); padding: 13px; background: #fff; box-shadow: var(--shadow-sm); }
.admin-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.admin-phone { font-size: 16px; font-weight: 600; }
.admin-sub { font-size: 12px; color: #8a938f; margin-top: 3px; }
.admin-tags { display: flex; gap: 6px; }
.admin-card-ops { display: flex; gap: 8px; margin-top: 10px; }
.admin-card-ops .el-button { flex: 1; margin-left: 0; }
.pwd-head { display: flex; justify-content: space-between; align-items: center; }
.pwd-row { display: flex; gap: 10px; margin-top: 12px; }
.logout-btn { width: 100%; margin-top: 6px; }

/* 头像 */
.avatar-upload { flex: 0 0 auto; }
.avatar-wrap {
  position: relative; width: 56px; height: 56px; border-radius: 15px;
  overflow: hidden; cursor: pointer;
}
.avatar-wrap .brand-mark { width: 56px; height: 56px; border-radius: 15px; }
.avatar-img { width: 56px; height: 56px; object-fit: cover; display: block; }
.avatar-edit {
  position: absolute; left: 0; right: 0; bottom: 0; height: 18px; line-height: 18px;
  text-align: center; font-size: 10px; color: #fff; background: rgba(0, 0, 0, .45);
}
/* 头像查看弹窗 */
.avatar-view { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.avatar-view-img {
  width: 200px; height: 200px; max-width: 70vw; max-height: 70vw;
  object-fit: cover; border-radius: 16px; box-shadow: var(--shadow-md);
}
.avatar-view-ops { display: flex; gap: 12px; }
.fb-badge { margin-left: 6px; }

/* 功能宫格:图标在上、名称在下 */
.action-grid { display: flex; flex-wrap: wrap; gap: 20px; }
.action-tile {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: 68px; cursor: pointer;
}
.action-tile .tile-ico {
  width: 52px; height: 52px; border-radius: 15px;
  display: flex; align-items: center; justify-content: center;
  background: var(--brand-soft, #eef6f2); color: var(--brand, #275e4d);
  transition: transform .15s;
}
.action-tile:active .tile-ico { transform: scale(.93); }
.action-tile span { font-size: 13px; color: var(--text, #2b3a34); }

/* 字典管理 */
.dict-tip {
  font-size: 12px; line-height: 1.6; color: #7d8a84;
  background: #f6faf7; border: 1px solid #e3efe8; border-radius: 10px;
  padding: 9px 11px; margin-bottom: 14px;
}
.dict-group + .dict-group { margin-top: 16px; }
.dict-group-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dict-group-title { font-size: 14px; font-weight: 600; }
.dict-group-title em {
  font-style: normal; font-size: 12px; font-weight: 500; color: var(--el-color-primary);
  background: #eef6f2; border-radius: 9px; padding: 1px 7px; margin-left: 6px;
}
.dict-group-title small { display: block; font-size: 12px; font-weight: 400; color: #9aa5a0; margin-top: 3px; }
.dict-items {
  margin-top: 9px; border: 1px solid var(--line); border-radius: 10px; overflow: hidden;
}
.dict-item {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 12px; background: #fff;
}
.dict-item + .dict-item { border-top: 1px solid var(--line); }
.dict-item-main { flex: 1; min-width: 0; }
.dict-item-name {
  font-size: 14px; display: block;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dict-item-account {
  display: block; margin-top: 2px; font-size: 12px; color: #7d8a84;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dict-item-account.empty { color: #b9c2bd; }
.dict-item-ops { flex: 0 0 auto; display: flex; gap: 12px; }
.dict-item-ops .el-button { margin-left: 0; font-size: 13px; }
/* 记一笔里的账号格子:只读,值来自字典,右边一个「改」直接改字典 */
.dict-readonly .el-input__wrapper { background: #f6f8f7; box-shadow: 0 0 0 1px #e3e8e5 inset; }
.dict-readonly .el-input__inner { color: var(--text, #2b3a34); cursor: default; }
.dict-fix { font-size: 12px; color: var(--el-color-primary); cursor: pointer; padding-left: 4px; }
.dict-fix:active { opacity: .6; }
.dict-empty {
  margin-top: 9px; padding: 14px; text-align: center; font-size: 13px; color: #9aa5a0;
  border: 1px dashed #dde6e1; border-radius: 10px;
}

/* 反馈 */
.fb-form { display: flex; flex-direction: column; gap: 12px; }
.fb-upload { --el-upload-list-picture-card-size: 80px; }
.fb-title { font-size: 14px; font-weight: 600; margin: 18px 0 10px; }
.fb-item {
  border: 1px solid var(--line); border-radius: var(--card-radius);
  padding: 12px; margin-bottom: 10px; background: #fff;
}
.fb-item-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-bottom: 6px; }
.fb-content { font-size: 14px; white-space: pre-wrap; word-break: break-word; }
.fb-imgs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.fb-img { width: 64px; height: 64px; border-radius: 8px; cursor: pointer; }
.fb-reply {
  margin-top: 8px; padding: 8px 10px; background: var(--brand-soft, #eef6f2);
  border-radius: 8px; font-size: 13px; white-space: pre-wrap; word-break: break-word;
}
.fb-reply b { color: var(--brand, #275e4d); }
.fb-reply-box { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; }
.fb-reply-box .el-textarea { flex: 1; }

.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

.ai-edit-images { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.ai-edit-pane { min-width: 0; }
.ai-edit-label { font-size: 13px; color: var(--muted); margin-bottom: 6px; }
.ai-edit-box {
  aspect-ratio: 1; border: 1px dashed var(--el-border-color); border-radius: 10px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  background: var(--el-fill-color-lighter);
}
.ai-edit-box.clickable { cursor: pointer; }
.ai-edit-box img { width: 100%; height: 100%; object-fit: contain; cursor: zoom-in; }
.ai-edit-box.clickable img { cursor: pointer; }
.ai-edit-empty { font-size: 13px; color: var(--muted); padding: 0 8px; text-align: center; }
.ai-edit-presets { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.ai-edit-hint { font-size: 12px; color: #9aa5a0; line-height: 1.5; }
.ai-edit-error {
  display: flex; flex-direction: column; gap: 4px;
  padding: 10px 12px; border-radius: 10px; line-height: 1.6;
  background: #fdf3f2; border: 1px solid #f3d9d6; color: #a4504b;
}
.ai-edit-error b { font-size: 13px; font-weight: 600; }
.ai-edit-error span { font-size: 12px; color: #b07772; }
.ai-edit-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
.ai-edit-actions .el-button { flex: 1; min-width: 96px; height: 42px; font-size: 15px; margin: 0; }
.ai-edit-dialog a.el-button { text-decoration: none; }
.brand { display: flex; align-items: center; gap: 14px; }
.brand-mark {
  width: 48px; height: 48px; border-radius: 13px;
  background: var(--brand-grad); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 700; flex: 0 0 auto;
  box-shadow: 0 6px 16px rgba(39, 94, 77, .28);
}
.brand h1 { margin: 0; font-size: 20px; letter-spacing: 2px; }
.brand p { margin: 2px 0 0; font-size: 12px; color: #8a938f; }

.stats-toggle {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border: 1px solid var(--line); border-radius: var(--card-radius);
  padding: 12px 16px; margin-bottom: 12px; box-shadow: var(--shadow-sm);
  font-size: 14px; font-weight: 600; cursor: pointer; user-select: none;
  transition: box-shadow .2s;
}
.stats-toggle:hover { box-shadow: var(--shadow-md); }
.stats-toggle-arrow { font-size: 12px; font-weight: 400; color: var(--muted); }

/* 丝滑展开/收起:用 grid-template-rows 0fr↔1fr 过渡,比动画 height 更顺、更省 */
.collapsible {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows .26s cubic-bezier(.4, 0, .2, 1);
}
.collapsible.open { grid-template-rows: 1fr; }
.collapsible > .collapsible-inner { overflow: hidden; min-height: 0; }

.stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 18px; }
.stat-card {
  background: #fff; border: 1px solid var(--line); border-radius: var(--card-radius);
  padding: 15px 16px; display: flex; flex-direction: column; gap: 5px;
  box-shadow: var(--shadow-sm);
}
.stat-label { font-size: 12px; color: var(--muted); }
.stat-value { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.stat-sub { font-size: 12px; color: #c46a2b; }
.stat-card.warn .stat-value { color: #c0392b; }
.stat-card.clickable { cursor: pointer; transition: box-shadow .15s, transform .15s; }
.stat-card.clickable:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }

.filters { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px;
  background: #fff; border: 1px solid var(--line); border-radius: var(--card-radius); padding: 12px 14px;
  box-shadow: var(--shadow-sm); }
.filters .filter-item { width: 120px; }
.filters .filter-btns { display: flex; gap: 10px; margin-left: auto; }

.smart-paste {
  display: flex; gap: 10px; align-items: stretch;
  margin-bottom: 16px; padding: 10px;
  background: #eef4f1; border: 1px dashed var(--el-color-primary); border-radius: 8px;
}
.smart-paste .el-textarea { flex: 1; }
.smart-paste .el-button { height: auto; }

.record-extract-bar {
  display: flex; align-items: center; gap: 12px;
  margin: 0 0 14px 90px; padding: 10px 12px;
  border: 1px dashed rgba(47, 118, 95, .45); border-radius: 9px;
  background: #f1f7f4;
}
.record-extract-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.record-extract-copy strong { color: var(--ink); font-size: 14px; }
.record-extract-copy span {
  color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.record-extract-bar .el-button { flex: 0 0 auto; margin: 0; }

.ledger { border-radius: var(--card-radius); overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow-sm); }
.ledger .el-table__row { cursor: pointer; }

/* 新增/编辑弹窗:字段标签加粗(输入框、下拉里的内容保持正常字重) */
.el-dialog .el-form-item__label { font-weight: 700; color: var(--ink); }
.rec-card { cursor: pointer; }

/* 详情弹窗 */
.detail-hero {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 16px; color: #fff; border-radius: 14px;
  background: linear-gradient(135deg, #2f765f, #255e4d);
  box-shadow: 0 8px 22px rgba(39, 104, 82, .18);
}
.detail-name { font-size: 20px; line-height: 1.3; font-weight: 700; }
.detail-meta { margin-top: 5px; font-size: 13px; color: rgba(255,255,255,.78); }
.detail-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
.detail-hero-right strong { font-size: 22px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.detail-cell { padding: 12px 14px; background: #fff; border: 1px solid #e7eae6; border-radius: 11px; }
.detail-cell span, .detail-text span { display: block; margin-bottom: 5px; font-size: 12px; color: #8a938f; }
.detail-cell b { display: block; color: var(--ink); font-size: 15px; overflow-wrap: anywhere; }
.detail-cell b.ok { color: #2f765f; }
.detail-cell b.warn { color: #d05b55; }
.detail-text-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.detail-text { padding: 12px 14px; background: #fff; border: 1px solid #e7eae6; border-radius: 11px; }
.detail-text p { margin: 0; color: #3f4944; line-height: 1.55; overflow-wrap: anywhere; }
.detail-block { margin-top: 12px; padding: 12px 14px; background: #fff; border: 1px solid #e7eae6; border-radius: 11px; }
.detail-title { font-size: 13px; font-weight: 600; color: #66716b; margin-bottom: 10px; }
.detail-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.detail-count { font-size: 12px; font-weight: 500; color: #8a938f; }
/* 订单号:整格可点,点一下复制 */
.order-cell { cursor: pointer; transition: border-color .15s, background .15s; }
.order-cell:hover { border-color: #bcd3c7; background: #f7faf8; }
.order-cell:active { background: #eef4f0; }
.detail-cell b.ellipsis {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; overflow-wrap: normal;
}
/* 订单号:上面一个添加按钮,下面一行一个,每行行尾都能删 */
.order-no-list { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.order-no-add {
  width: 100%; height: 32px; padding: 0; cursor: pointer;
  font-size: 13px; color: var(--el-color-primary); background: #f6faf7;
  border: 1px dashed #bcd3c7; border-radius: 8px;
}
.order-no-add:hover { background: #eef5f0; border-color: var(--el-color-primary); }
.order-no-add:active { background: #e5efe9; }
.order-no-list .el-input-group__append { padding: 0; background: #f6f8f6; }
.order-no-btn {
  width: 34px; height: 100%; padding: 0; line-height: 1;
  font-size: 18px; color: #a6b0aa; background: transparent;
  border: none; border-radius: 0; cursor: pointer;
}
.order-no-btn:hover { color: #d05b55; background: #faecec; }

/* 评价/订单截图:等宽方格,点开看大图 */
.shot-grid {
  display: grid; gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
}
.shot-img {
  width: 100%; aspect-ratio: 1; object-fit: cover; cursor: zoom-in;
  border: 1px solid #e7eae6; border-radius: 9px; background: #f0f2ef;
  transition: transform .12s, box-shadow .15s;
}
.shot-img:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(31, 63, 52, .12); }
.express-title { display: flex; align-items: center; justify-content: space-between; }
.express-line { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 10px; }
.express-traces { position: relative; padding-left: 4px; }
.express-trace { position: relative; padding: 0 0 12px 16px; border-left: 2px solid #e7eae6; }
.express-trace:last-child { border-left-color: transparent; padding-bottom: 0; }
.express-trace::before { content: ''; position: absolute; left: -5px; top: 4px; width: 8px; height: 8px;
  border-radius: 50%; background: #c4cbc6; }
.express-trace.latest::before { background: #3a8f5f; box-shadow: 0 0 0 3px rgba(58,143,95,.15); }
.express-trace.latest .express-ctx { color: #2f3833; font-weight: 600; }
.express-time { font-size: 12px; color: #8a938f; margin-bottom: 2px; }
.express-ctx { font-size: 13px; color: #3f4944; line-height: 1.5; overflow-wrap: anywhere; }
.express-empty { font-size: 13px; color: #8a938f; }
.detail-imgs { display: flex; flex-wrap: wrap; gap: 8px; }
.detail-img { width: 80px; height: 80px; border-radius: 8px; }
.dim { color: #c0c4cc; }
.pager { margin-top: 16px; justify-content: flex-end; }

/* 手机卡片列表 */
.card-list { display: flex; flex-direction: column; gap: 10px; }
.rec-card { background: #fff; border: 1px solid var(--line); border-radius: var(--card-radius); padding: 13px 15px; box-shadow: var(--shadow-sm); transition: box-shadow .2s, transform .1s; }
.rec-card:active { transform: scale(.995); }
.rec-card:hover { box-shadow: var(--shadow-md); }
.rec-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.rec-name { font-size: 16px; font-weight: 600; }
.rec-owner { margin-top: 4px; font-size: 12px; color: var(--el-color-primary); font-weight: 600; }
.rec-money { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.rec-cost { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rec-extra { font-size: 13px; color: #6b756f; }
.rec-meta { margin-top: 6px; font-size: 12px; color: #8a938f; }
.rec-note { margin-top: 4px; font-size: 12px; color: #6b756f; display: flex; flex-direction: column; gap: 2px; }
.rec-foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; margin-top: 8px; }
.rec-images, .table-images { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.rec-images { flex: 1; }
.rec-img { width: 56px; height: 56px; border-radius: 8px; flex: 0 0 auto; }
.table-img { width: 44px; height: 44px; border-radius: 6px; flex: 0 0 auto; }
.rec-img, .table-img { cursor: zoom-in; overflow: hidden; background: #f0f2ef; }
.rec-ops { flex: 0 0 auto; }

/* 下拉列表底部的简单添加入口 */
.el-select-dropdown__item.select-add-option {
  color: var(--el-color-primary); font-weight: 600;
  border-top: 1px solid #edf0ed;
}

@media (max-width: 900px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  /* App壳层:body不滚动,滚动发生在内容容器内,底栏永不错层 */
  html, body { height: 100%; overflow: hidden; }
  .login-page { height: 100dvh; overflow-y: auto; }
  .page.has-tabbar {
    height: 100dvh; overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .page { padding: 12px 12px 40px; }

  /* 底部留出固定 tabbar 的高度(含 iPhone 安全区),分页不再被遮住 */
  .page.has-tabbar { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
  .topbar { margin-bottom: 14px; }
  .brand-mark { width: 40px; height: 40px; font-size: 22px; }
  .brand h1 { font-size: 17px; letter-spacing: 1px; }
  .brand p { display: none; }
  .stats { gap: 8px; }
  .stat-card { padding: 10px 12px; }
  .stat-value { font-size: 18px; }
  .filters { padding: 10px; gap: 8px; }
  /* 四个下拉两两一行,查询/重置等分末行 */
  .filters .filter-item { flex: 1 1 calc(50% - 4px); width: auto !important; min-width: 0; }
  .filters .filter-btns { flex: 1 1 100%; margin-left: 0; gap: 8px; }
  .filters .filter-btns .el-button { flex: 1; margin-left: 0; height: 38px; }
  /* 分页:居中并允许换行,窄屏不再被裁切 */
  .pager { justify-content: center; flex-wrap: wrap; row-gap: 8px; }
  .pager .el-pager li { min-width: 30px; }

  .el-dialog.is-fullscreen.detail-dialog .el-dialog__body {
    padding: 12px 12px 18px; background: #f5f7f4;
  }
  .detail-hero { padding: 14px; border-radius: 12px; }
  .detail-name { font-size: 18px; }
  .detail-hero-right strong { font-size: 20px; }
  .detail-grid { gap: 8px; }
  .detail-cell { min-height: 66px; padding: 10px 11px; box-sizing: border-box; }
  .detail-text { padding: 11px 12px; }

  /* 全屏弹窗:标题和按钮固定,中间表单区滚动,键盘弹出布局不跳 */
  .el-dialog.is-fullscreen {
    display: flex; flex-direction: column;
    /* 用 dvh 而不是 Element Plus 默认的 height:100%:
       100% 算的是含地址栏那一块的大视口,底部按钮会掉到可见区域外面 */
    height: 100dvh; max-height: 100dvh;
    touch-action: pan-y;
  }
  .el-dialog.is-fullscreen .el-dialog__body {
    flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain; /* 弹窗内滚到底不再把滚动传给底层列表 */
  }
  /* 兜底:输入字号不小于16px,防止安卓浏览器聚焦时自动放大页面 */
  .el-dialog .el-input__inner,
  .el-dialog .el-textarea__inner { font-size: 16px; }

  /* 手机表单:指定字段双列排列，卡片式控件让新增/编辑更清晰 */
  .el-dialog.is-fullscreen .el-col { max-width: 100%; flex: 0 0 100%; }
  .el-dialog.is-fullscreen .record-form .form-half {
    max-width: 50%; flex: 0 0 50%;
  }
  .el-dialog.is-fullscreen .record-form .form-half .el-form-item {
    min-height: 82px; box-sizing: border-box;
  }
  .el-dialog.is-fullscreen .record-form .el-form-item {
    display: block; margin-bottom: 10px; padding: 9px 10px 10px;
    background: #fff; border: 1px solid #e8ebe7; border-radius: 10px;
    box-shadow: 0 1px 2px rgba(27, 67, 53, .04);
  }
  .el-dialog.is-fullscreen .record-form .el-form-item__label {
    display: block; width: auto !important; height: 22px; text-align: left;
    padding: 0; font-size: 13px; line-height: 20px;
    font-weight: 700; color: var(--ink);
  }
  .el-dialog.is-fullscreen .record-form .el-form-item__content {
    width: 100%; min-width: 0; margin-left: 0 !important;
  }
  .el-dialog.is-fullscreen .record-form .form-switch .el-form-item__content {
    min-height: 32px; display: flex; align-items: center;
  }
  .el-dialog.is-fullscreen .record-form .el-form-item__error {
    position: static; padding-top: 4px;
  }
  .el-dialog.is-fullscreen .el-form-item__content .el-input,
  .el-dialog.is-fullscreen .el-form-item__content .el-select,
  .el-dialog.is-fullscreen .el-form-item__content .el-date-editor,
  .el-dialog.is-fullscreen .el-form-item__content .el-input-number { width: 100% !important; }
  .el-dialog.is-fullscreen .record-form .el-input__wrapper,
  .el-dialog.is-fullscreen .record-form .el-select__wrapper {
    height: 38px; min-height: 38px; box-sizing: border-box; padding: 5px 10px;
  }
  .el-dialog.is-fullscreen .record-form .el-input-number .el-input__inner { text-align: left; }
  .el-dialog.is-fullscreen .record-form .el-row { row-gap: 0; }

  /* 图片上传字段:标签回到上方,上传框在下,避免被挤到右边 */
  .el-dialog.is-fullscreen .el-form-item:has(.el-upload) { display: block; }
  .el-dialog.is-fullscreen .el-form-item:has(.el-upload) .el-form-item__label {
    width: auto !important; flex: none; padding-bottom: 6px;
  }
  .el-dialog.is-fullscreen .el-dialog__header {
    border-bottom: 1px solid #eee; margin-right: 0; padding: 14px 16px;
  }
  .el-dialog.is-fullscreen.record-dialog .el-dialog__body {
    padding: 12px 12px 16px; background: #f5f7f4;
  }
  .el-dialog.is-fullscreen .record-extract-bar {
    margin: 0 0 10px; padding: 10px; background: #fff;
  }
  .el-dialog.is-fullscreen .record-extract-copy span { max-width: 52vw; }
  /* AI 修图:按钮在内容区里,底部多留出固定导航栏的高度,滚到底也能完整点到 */
  .el-dialog.is-fullscreen.ai-edit-dialog .el-dialog__body {
    padding-bottom: calc(96px + env(safe-area-inset-bottom));
  }

  /* 全屏弹窗的底部按钮正好落在底部导航那条位置上,会被导航盖住点不到
     (手机端 1.jpg、字典管理的「关闭」都是这么丢的)。
     Element Plus 开弹窗时会给 body 加 el-popup-parent--hidden,借它把导航先藏起来,
     关掉弹窗自动恢复。这样所有弹窗一次性都不会再被遮。 */
  body.el-popup-parent--hidden .tabbar { display: none; }

  /* 底部按钮:App 式大按钮,固定底部,避开 iPhone 底部横条 */
  .el-dialog.is-fullscreen .el-dialog__footer {
    display: flex; gap: 10px; border-top: 1px solid #eee;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  }
  .el-dialog.is-fullscreen .el-dialog__footer .el-button {
    flex: 1; height: 44px; font-size: 16px; margin: 0;
  }
}
/* 平台下拉列表 */
.platform-select-popper .el-select-dropdown__item {
  padding-left: 16px;
  padding-right: 8px;
}

/* 平台名称与删除按钮 */
.platform-option-row {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
}

.platform-option-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 下拉项右边淡淡地带出这个平台配的账号 */
.platform-option-account {
  flex: 0 1 auto;
  min-width: 0;
  margin-left: 8px;
  font-size: 12px;
  color: #9aa5a0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 右侧 × 删除按钮 */
.platform-delete-icon {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-left: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  outline: none;
  border-radius: 50%;
  background: transparent;

  color: #b4bbb7;
  font-size: 20px;
  font-family: Arial, sans-serif;
  font-weight: 300;
  line-height: 1;

  cursor: pointer;
  transition:
      color 0.2s,
      background-color 0.2s,
      transform 0.1s;
}

.platform-delete-icon:hover {
  color: #f56c6c;
  background: #fef0f0;
}

.platform-delete-icon:active {
  color: #e64242;
  background: #fde2e2;
  transform: scale(0.9);
}

/* 底部添加按钮 */
.platform-select-popper
.el-select-dropdown__item.select-add-option {
  padding: 0;
  text-align: center;
  color: var(--el-color-primary);
  font-size: 20px;
  font-weight: 500;
  border-top: 1px solid #edf0ed;
}

/* 手机没有 hover，默认稍微明显一点 */
@media (max-width: 768px) {
  .platform-delete-icon {
    color: #929a96;
    font-size: 21px;
  }
}

/* ---------- 自定义图片查看器 ---------- */
.img-viewer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, .9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}
.img-viewer .iv-stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.img-viewer .iv-img {
  max-width: 92vw;
  max-height: 92vh;
  object-fit: contain;
  transform-origin: center center;
  will-change: transform;
  -webkit-user-drag: none;
}
.img-viewer .iv-close {
  position: absolute;
  top: 14px;
  right: 18px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  padding-bottom: 3px; /* × 字形偏上,微调回正 */
  color: #fff;
  background: var(--brand-grad, #2f6e5a);
  border: 1px solid rgba(255, 255, 255, .5);
  border-radius: 50%;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .3);
}
/* 所有弹窗右上角关闭按钮:绿色圆底,白图/白底上都清晰可见 */
.el-dialog__headerbtn {
  width: 30px; height: 30px; top: 14px; right: 14px;
  border-radius: 50%; background: var(--brand-grad, #2f6e5a);
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
}
.el-dialog__headerbtn .el-dialog__close {
  color: #fff; font-weight: 700;
  position: static; margin: 0; line-height: 1; /* 去掉 EP 自带偏移,flex 硬居中 */
}
.el-dialog__headerbtn:hover { opacity: .9; }
.el-dialog__headerbtn:hover .el-dialog__close { color: #fff; }
.img-viewer .iv-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  line-height: 48px;
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 0, 0, .55);
  border: 1px solid rgba(255, 255, 255, .5);
  border-radius: 50%;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .35);
  transition: background .15s, transform .15s;
}
.img-viewer .iv-nav:active { transform: translateY(-50%) scale(.9); background: rgba(0, 0, 0, .75); }
.img-viewer .iv-nav.prev { left: 16px; }
.img-viewer .iv-nav.next { right: 16px; }
.img-viewer .iv-count {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 14px;
  font-size: 14px;
  color: #fff;
  background: rgba(255, 255, 255, .14);
  border-radius: 14px;
  z-index: 2;
}
</style>

