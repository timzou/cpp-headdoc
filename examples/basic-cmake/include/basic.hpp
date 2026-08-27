#pragma once

namespace basic {

/**
 * @brief 将两个整数相加。
 *
 * 文档位于头文件声明，定义位于 basic.cpp；打开定义即可查看 DocLens 摘要和 Hover。
 *
 * @param[in] left 左操作数。
 * @param[in] right 右操作数。
 * @return 两个操作数的和。
 */
int add(int left, int right);

/**
 * @brief 返回输入值是否为正数。
 * @param[in] value 待检查的整数。
 * @return 输入值大于零时返回 true。
 */
bool isPositive(int value);

} // namespace basic
