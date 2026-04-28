import{s as i,_ as d,o as t,c as s,a as o,e as a,N as l,u as r,t as n,d as p,O as y}from"./main.js";/**
 * @license lucide-vue-next v0.373.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=i("InboxIcon",[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]]),u={class:"empty-state"},_={class:"empty-icon"},f={class:"empty-title"},h={key:0,class:"empty-desc"},k={__name:"EmptyState",props:{title:{type:String,default:"Sin resultados"},description:{type:String,default:""},icon:{type:Object,default:null}},setup(e){return(c,S)=>(t(),s("div",u,[o("div",_,[e.icon?(t(),a(l(e.icon),{key:0,size:40})):(t(),a(r(m),{key:1,size:40}))]),o("h3",f,n(e.title),1),e.description?(t(),s("p",h,n(e.description),1)):p("",!0),y(c.$slots,"default",{},void 0)]))}},I=d(k,[["__scopeId","data-v-97882672"]]);export{I as E};
