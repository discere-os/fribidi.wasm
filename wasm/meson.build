fribidi_wasm_cargs = ['-msimd128', '-DFRIBIDI_WASM=1']

fribidi_main_link_args = [
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sEXPORT_NAME=FribidiModule',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sENVIRONMENT=web,webview,worker',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString"]',
  '-O3',
  '-flto',
]

executable(
  'fribidi-main',
  files('fribidi_wasm_module.c'),
  dependencies: [libfribidi_dep],
  c_args: fribidi_wasm_cargs,
  link_args: fribidi_main_link_args,
  install: true,
  install_dir: get_option('bindir'),
)

fribidi_side_link_args = [
  '-sSIDE_MODULE=2',
  '-fPIC',
  '-O3',
  '-flto',
  '-sERROR_ON_UNDEFINED_SYMBOLS=0',  # Host provides dependencies (glib, etc.)
  '-sEXPORTED_FUNCTIONS=["_fribidi_wasm_version"]',
]

shared_module(
  'fribidi-side',
  files('fribidi_wasm_side.c'),
  dependencies: [libfribidi_dep],
  name_prefix: '',
  name_suffix: 'wasm',
  c_args: fribidi_wasm_cargs,
  link_args: fribidi_side_link_args,
  install: true,
  install_dir: get_option('libdir'),
)

