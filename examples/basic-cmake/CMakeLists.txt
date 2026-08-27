cmake_minimum_required(VERSION 3.20)

project(cpp_header_doclens_basic LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_library(basic STATIC
    src/basic.cpp
)

target_include_directories(basic
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(basic-demo
    src/main.cpp
)

target_link_libraries(basic-demo PRIVATE basic)
