.globl	_v
.comm	_v,24
.globl	_main
.text
_main:
~~main:
~p=177770
~q=177766
~s=177764
~t=177762
jsr	r5,csv
sub	$10,sp
mov	$2+_v,-10(r5)
mov	$16+_v,-12(r5)
mov	$L2,-14(r5)
mov	-14(r5),r0
add	$4,r0
mov	r0,-16(r5)
mov	r0,(sp)
sub	-14(r5),(sp)
mov	-12(r5),r0
sub	-10(r5),r0
asr	r0
mov	r0,-(sp)
mov	$L3,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
mov	-10(r5),r0
add	$6,r0
mov	r0,-10(r5)
sub	$_v,r0
asr	r0
mov	r0,(sp)
mov	$L4,-(sp)
jsr	pc,*$_printf
tst	(sp)+
jmp	cret
.globl
.data
L2:.byte 141,142,143,144,145,146,0
L3:.byte 45,144,40,45,144,12,0
L4:.byte 45,144,12,0
