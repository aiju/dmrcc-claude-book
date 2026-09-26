# Source

Unmodified source of Dennis Ritchie's C compiler from Research Unix Sixth Edition (1975),
taken from `usr/source/c/` and `usr/source/s1/cc.c` on the `Research-V6` branch of
<https://github.com/dspinellis/unix-history-repo> (commit 4b87ee08354dc081ad897853173e6f7f4b52c116).

`csv.s` (the function prologue/epilogue from the C library) is not part of the
compiler, but compiled code depends on it. It was copied from
`/usr/source/s4/csv.s` on the Ken Wellsch V6 distribution tape.
