import { useEffect, useRef } from "react";
import "./MagicBackground.css";

type Particle = {
  x:number; y:number; size:number; speedX:number; speedY:number;
  alpha:number; alphaDirection:number; rotation:number; rotationSpeed:number;
  type:"star"|"spark"|"dust";
};

export default function MagicBackground() {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const containerRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const canvas=canvasRef.current, container=containerRef.current;
    if(!canvas||!container) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    let width=window.innerWidth, height=window.innerHeight, frame=0;
    const particles:Particle[]=[];
    let mouseX=width/2, mouseY=height/2, targetX=mouseX, targetY=mouseY;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");

    const count=()=>reduced.matches?25:(width*height<500000?40:width*height<1000000?65:95);
    const create=():Particle=>{
      const r=Math.random(); const type=r<.15?"star":r<.42?"spark":"dust";
      return {x:Math.random()*width,y:Math.random()*height,
        size:type==="star"?Math.random()*2+1:type==="spark"?Math.random()*1.3+.5:Math.random()+.3,
        speedX:(Math.random()-.5)*.12,speedY:-(Math.random()*.25+.03),
        alpha:Math.random()*.6+.15,alphaDirection:Math.random()>.5?1:-1,
        rotation:Math.random()*Math.PI*2,rotationSpeed:(Math.random()-.5)*.01,type};
    };
    const reset=()=>{particles.length=0;for(let i=0;i<count();i++)particles.push(create());};
    const resize=()=>{
      width=window.innerWidth;height=window.innerHeight;const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);reset();
    };
    const star=(p:Particle)=>{
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.globalAlpha=p.alpha;
      ctx.shadowBlur=p.size*8;ctx.shadowColor="rgba(255,220,150,.9)";ctx.fillStyle="rgba(255,235,190,.95)";
      const s=p.size;ctx.beginPath();ctx.moveTo(0,-s*2.8);ctx.lineTo(s*.65,-s*.65);ctx.lineTo(s*2.8,0);ctx.lineTo(s*.65,s*.65);ctx.lineTo(0,s*2.8);ctx.lineTo(-s*.65,s*.65);ctx.lineTo(-s*2.8,0);ctx.lineTo(-s*.65,-s*.65);ctx.closePath();ctx.fill();ctx.restore();
    };
    const dot=(p:Particle)=>{
      ctx.save();ctx.globalAlpha=p.alpha;ctx.shadowBlur=8;ctx.shadowColor="rgba(190,130,255,.9)";ctx.fillStyle="rgba(220,195,255,.9)";
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.restore();
    };
    const dust=(p:Particle)=>{
      ctx.save();ctx.globalAlpha=p.alpha*.55;ctx.fillStyle="rgba(255,215,170,.8)";ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.restore();
    };
    const animate=()=>{
      ctx.clearRect(0,0,width,height);targetX+=(mouseX-targetX)*.035;targetY+=(mouseY-targetY)*.035;
      const nx=width?targetX/width-.5:0, ny=height?targetY/height-.5:0;
      container.style.setProperty("--mouse-x",`${nx*18}px`);container.style.setProperty("--mouse-y",`${ny*18}px`);
      particles.forEach(p=>{
        if(!reduced.matches){p.x+=p.speedX;p.y+=p.speedY;p.rotation+=p.rotationSpeed;p.alpha+=p.alphaDirection*.002;
          if(p.alpha>=.85)p.alphaDirection=-1;if(p.alpha<=.08)p.alphaDirection=1;}
        if(p.y<-20){p.y=height+20;p.x=Math.random()*width;} if(p.x<-20)p.x=width+20;if(p.x>width+20)p.x=-20;
        p.type==="star"?star(p):p.type==="spark"?dot(p):dust(p);
      });
      frame=requestAnimationFrame(animate);
    };
    const move=(e:PointerEvent)=>{mouseX=e.clientX;mouseY=e.clientY};
    const leave=()=>{mouseX=width/2;mouseY=height/2};
    const touch=(e:TouchEvent)=>{const t=e.touches[0];if(t){mouseX=t.clientX;mouseY=t.clientY}};
    resize();window.addEventListener("resize",resize);window.addEventListener("pointermove",move);window.addEventListener("pointerleave",leave);window.addEventListener("touchmove",touch,{passive:true});frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);window.removeEventListener("pointermove",move);window.removeEventListener("pointerleave",leave);window.removeEventListener("touchmove",touch)};
  },[]);
  return <div ref={containerRef} className="magic-background" aria-hidden="true">
    <div className="magic-background-image"/><div className="magic-aura magic-aura-left"/><div className="magic-aura magic-aura-right"/>
    <div className="magic-moon-glow"/><div className="magic-heart"><span>♥</span></div><canvas ref={canvasRef} className="magic-particles"/><div className="magic-stars"/><div className="magic-vignette"/>
  </div>;
}
