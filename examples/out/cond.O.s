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
jne	L3
L10000:jsr	pc,_g
jbr	L3
L20001:inc	_a
L3:cmp	_b,_a
jgt	L20001
cmp	_b,_a
jlt	L10002
clr	r0
jbr	L10003
L10002:mov	$1,r0
L10003:mov	r0,_c
jmp	cret
.globl
.data
