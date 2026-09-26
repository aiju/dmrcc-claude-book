.globl	_p
.comm	_p,2
.globl	_f
.text
_f:
~~f:
jsr	r5,csv
tst	_p
tst	_p
/nop	L3
jsr	pc,_h
tst	_p
jne	L1
jsr	pc,_k
L1:jmp	cret
.globl
.data
