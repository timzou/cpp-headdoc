#pragma once

#define Q_INVOKABLE

namespace fixture {
/// Free function documentation.
int freeFunction(int value);

template <typename T>
class Scenarios {
public:
    /** Constructor documentation. */
    Scenarios();
    /** Destructor documentation. */
    ~Scenarios();
    /** Static member documentation. */
    static int create();
    /** Const member documentation. */
    int value() const noexcept;
    /** Overload one documentation. */
    int convert(int value) const;
    /** Overload two documentation. */
    int convert(double value) const;
    /** Operator documentation. */
    bool operator==(const Scenarios& other) const;
    /** Qt-style macro documentation. */
    virtual Q_INVOKABLE int invoke() final;
    /** Multiline declaration documentation. */
    [[nodiscard]] constexpr int multiline(
        int first,
        int second) const;
};
}
