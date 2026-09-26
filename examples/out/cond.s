.globl	_a
.comm	_a,2
.globl	_b
.comm	_b,2
.globl	_c
.comm	_c,2
.globl	_f
.text
_f:
~~f:
jsr	r5,csv
tst	_a
jeq	L10001
tst	_b
jne	L10000
L10001:tst	_c
jne	L2
L10000:jsr	pc,_g
L2:L3:cmp	_b,_a
jle	L4
inc	_a
jbr	L3
L4:cmp	_b,_a
jlt	L10002
clr	r0
jbr	L10003
L10002:mov	$1,r0
L10003:mov	r0,_c
L1:jmp	cret
.globl
.data
