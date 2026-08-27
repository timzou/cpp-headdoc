#include "../include/Scenarios.hpp"

namespace fixture {
int freeFunction(int value) { return value; }

template <typename T>
Scenarios<T>::Scenarios() = default;
template <typename T>
Scenarios<T>::~Scenarios() = default;
template <typename T>
int Scenarios<T>::create() { return 1; }
template <typename T>
int Scenarios<T>::value() const noexcept { return 1; }
template <typename T>
int Scenarios<T>::convert(int value) const { return value; }
template <typename T>
int Scenarios<T>::convert(double value) const { return static_cast<int>(value); }
template <typename T>
bool Scenarios<T>::operator==(const Scenarios& other) const { return this == &other; }
template <typename T>
int Scenarios<T>::invoke() { return 1; }
template <typename T>
constexpr int Scenarios<T>::multiline(
    int first,
    int second) const
{
    return first + second;
}
}
