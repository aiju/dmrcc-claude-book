.globl	_p
.comm	_p,2
.globl	_f
.text
_f:
~~f:
jsr	r5,csv
tst	_p
jbr	L2
jsr	pc,_g
L2:tst	_p
/nop	L3
jsr	pc,_h
L3:tst	_p
jne	L4
jsr	pc,_k
L4:L1:jmp	cret
.globl
.data
