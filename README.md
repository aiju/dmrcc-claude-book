# The Sixth Edition C Compiler, with Commentary

A commentary on Dennis Ritchie's C compiler as it was distributed with
Research Unix, Sixth Edition (1975), in the spirit of John Lions'
*Commentary on UNIX 6th Edition*: the complete source, numbered line by line,
and a commentary that walks through it.

Open [`docs/index.html`](docs/index.html) in a browser to read it. The
`docs/` directory is self-contained and can be served as a static site (for
example with GitHub Pages from `/docs`).

## What is in the book

* **The listing**: all of `c0`, `c1`, `c2`, the code tables, `cvopt`, the
  `cc` driver with its preprocessor, and the library's `csv`/`cret`, with
  global line numbers and a cross-reference index.
* **The commentary**: fourteen chapters and an appendix, from the `cc`
  command through lexing, parsing, types, declarations and statements in
  `c0`, tree rewriting, the code tables and code generation in `c1`, to the
  peephole improver `c2`, ending with one program followed through every
  stage.
* **Working models** in JavaScript of parts of the compiler: the lexer, the
  expression parser, the type word, declarator parsing, `build()`'s
  conversions, and the switch generator, plus viewers for real compiler
  data: the intermediate file, traces of `c1`, the code tables, and `c2`'s
  changes.

Every piece of compiler output in the book was produced by the original
binaries running on a simulated PDP-11/40. That also turned up several bugs
in the 1975 compiler, collected in the appendix.

## Layout

| Path | Contents |
|---|---|
| `src/` | the compiler source, unmodified (see `src/README.md`) |
| `book/chapters/` | the commentary, as HTML fragments |
| `book/assets/` | stylesheet and the scripts for the interactive figures |
| `examples/` | example programs; `examples/out/` holds what the V6 compiler made of them |
| `examples/trace/` | traces from an instrumented `c1` |
| `tools/v6/` | builds V6 disk images and drives the SIMH PDP-11 simulator |
| `tools/c1trace/` | builds the instrumented `c1` on V6 and traces examples |
| `build.py` | builds the book into `docs/` |

## Rebuilding

    python3 build.py

To regenerate the compiler output you need SIMH's `pdp11`, Python's
`pexpect`, and the V6 distribution tape:

    cd tools/v6
    curl -L -o v6.tap.bz2 'https://sourceforge.net/projects/bsd42/files/Install%20tapes/Research%20Unix/Unix-v6-Ken-Wellsch.tap.bz2/download'
    bzip2 -d v6.tap.bz2
    python3 mkdisks.py
    cd ../..
    python3 tools/run_examples.py            # examples/out/
    cd tools/v6 && python3 ../c1trace/trace.py sum expr cond loop vowels prec ptr decl init sw dist gen

`tools/checkrefs.py` prints the source lines each chapter cites, and
`tools/checklinks.py` checks the links in the built site.

## Sources

The source is from the `Research-V6` branch of Diomidis Spinellis's
[Unix History Repository](https://github.com/dspinellis/unix-history-repo).
The runnable system is Ken Wellsch's V6 distribution tape.
