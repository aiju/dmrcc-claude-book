.globl	_s
.data
_s:
.byte 150,151,0
.globl	_msg
.data
_msg:
L2
.globl	_after
.data
_after:
2322
.globl	_main
.text
_main:
~~main:
jsr	r5,csv
mov	$_after,(sp)
mov	$_msg,-(sp)
mov	$_s,-(sp)
mov	$L4,-(sp)
jsr	pc,*$_printf
add	$6,sp
movb	$130,4+_s
mov	_after,(sp)
mov	_msg,-(sp)
mov	$L5,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
L3:jmp	cret
.globl
.data
.=.+7
L2:.byte 150,145,154,154,157,0
L4:.byte 163,40,141,164,40,45,157,54,40,155,163,147,40,141,164,40,45,157,54,40,141,146,164,145,162,40,141,164,40,45,157,12,0
L5:.byte 45,163,40,45,144,12,0
