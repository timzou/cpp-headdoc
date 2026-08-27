#include "basic.hpp"

#include <iostream>

int main()
{
    std::cout << basic::add(2, 3) << '\n';
    std::cout << std::boolalpha << basic::isPositive(3) << '\n';
    return 0;
}
