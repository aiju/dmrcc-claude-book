.globl	_m
.comm	_m,30
.globl	_p
.comm	_p,6
.globl	_q
.comm	_q,2
.globl	_argv
.comm	_argv,12
.globl	_main
.text
_main:
~~main:
jsr	r5,csv
mov	$12,(sp)
mov	$2,-(sp)
mov	$6,-(sp)
mov	$30,-(sp)
mov	$L2,-(sp)
jsr	pc,*$_printf
add	$10,sp
mov	$10,(sp)
mov	$10,-(sp)
mov	$L3,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
jmp	cret
.globl
.data
L2:.byte 45,144,40,45,144,40,45,144,40,45,144,12,0
L3:.byte 45,144,40,45,144,12,0
