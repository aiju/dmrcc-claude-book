.globl	_x
.comm	_x,10
.globl	_f
.comm	_f,4
.globl	_i
.comm	_i,2
.globl	_main
.text
_main:
~~main:
jsr	r5,csv
movif	_i,r0
movf	r0,_x
movf	_x,r0
mulf	$40440,r0
movfi	r0,r0
mov	r0,_i
movf	_x,r0
addf	$40200,r0
movfo	r0,_f
mov	_i,(sp)
mov	$L2,-(sp)
jsr	pc,*$_printf
tst	(sp)+
L1:jmp	cret
.globl	fltused
.globl
.data
L2:.byte 45,144,12,0
