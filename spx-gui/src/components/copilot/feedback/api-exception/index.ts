import type { Component } from 'vue'

import { ApiExceptionCode } from '@/apis/common/exception'

import SignInTip from './SignInTip.vue'
import QuotaExceeded from './QuotaExceeded.vue'

export const apiExceptionComponentMap = new Map<ApiExceptionCode, Component>([
  [ApiExceptionCode.errorUnauthorized, SignInTip],
  [ApiExceptionCode.errorQuotaExceeded, QuotaExceeded]
])
