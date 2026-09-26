.globl	_a
.data
_a:
1
2
3
.globl	_s
.data
_s:
.byte 150,151,0
.globl	_msg
.data
_msg:
L2
.globl	_p
.data
_p:
2+_a
.globl	_st
.data
_st:
1
141
177777
.globl	_head
.comm	_head,2
.globl	_n1
.data
_n1:
5
_n1
.globl	_main
.text
_main:
~~main:
.bss
L4:.=.+2
.text
~calls=L4
jsr	r5,csv
mov	*_p,(sp)
mov	$12,-(sp)
mov	$6,-(sp)
mov	$L5,-(sp)
jsr	pc,*$_printf
add	$6,sp
tst	_head
jeq	L10000
clr	(sp)
jbr	L10001
L10000:mov	$1,(sp)
L10001:movb	2+_st,r0
mov	r0,-(sp)
mov	_msg,-(sp)
mov	$L6,-(sp)
jsr	pc,*$_printf
add	$6,sp
inc	L4
L3:jmp	cret
.globl
.data
.=.+7
L2:.byte 150,145,154,154,157,0
L5:.byte 45,144,40,45,144,40,45,144,12,0
L6:.byte 45,163,40,45,144,40,45,144,12,0
