#ifndef CONFIG_H
#define CONFIG_H
#define PACKAGE_NAME "GNU FriBidi"
#define PACKAGE_VERSION "1.0.16"
#define PACKAGE_STRING "GNU FriBidi 1.0.16"
#define PACKAGE_BUGREPORT "https://github.com/superstruct/fribidi.wasm/issues"
#define PACKAGE_URL ""
#define PACKAGE_TARNAME "fribidi"
#define PACKAGE "fribidi"
#define VERSION "1.0.16"
#define HAVE_CONFIG_H 1
#define SIZEOF_INT 4
#define SIZEOF_WCHAR_T 4
#define STDC_HEADERS 1
#define HAVE_STDLIB_H 1
#define HAVE_STRING_H 1
#define HAVE_MEMORY_H 1
#define HAVE_STRINGS_H 1
#define HAVE_INTTYPES_H 1
#define HAVE_STDINT_H 1
#define HAVE_UNISTD_H 1
#define HAVE_MEMSET 1
#define HAVE_MEMMOVE 1
#define HAVE_STRDUP 1
#define HAVE_STRINGIZE 1
#ifdef EMSCRIPTEN
#define SIZEOF_VOID_P 4
#else
#define SIZEOF_VOID_P 8
#endif
#endif
