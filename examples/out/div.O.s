.globl	_main
.text
_main:
~~main:
~four=177764
~x=177770
~y=177766
jsr	r5,csv
sub	$6,sp
mov	$-1,-10(r5)
mov	$-7,-12(r5)
mov	$4,-14(r5)
mov	-12(r5),r0
ash	$-2,r0
mov	r0,(sp)
mov	-10(r5),r0
ash	$-2,r0
mov	r0,-(sp)
mov	$L2,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
mov	-12(r5),r1
sxt	r0
div	-14(r5),r0
mov	r0,(sp)
mov	-10(r5),r1
sxt	r0
div	-14(r5),r0
mov	r0,-(sp)
mov	$L3,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
jmp	cret
.globl
.data
L2:.byte 45,144,40,45,144,12,0
L3:.byte 45,144,40,45,144,12,0
