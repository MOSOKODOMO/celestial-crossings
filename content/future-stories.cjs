// Original fictional fortune stories. Age windows are story devices, not forecasts.
const story=(id,thTitle,enTitle,th,en)=>({id,title:{th:thTitle,en:enTitle},text:{th,en}});
module.exports={
  version:'future-th-en-001',
  intro:{
    th:'ลองเปิดหน้าถัดไปของชีวิต ในเรื่องเล่านี้ สิ่งเล็ก ๆ ที่คุณเริ่มวันนี้อาจค่อย ๆ พาไปสู่บ้านที่อบอุ่น งานที่เป็นตัวเอง และอิสระที่จะเลือกทางเดิน ลองนึกภาพว่าบทต่อไปจะเป็นอย่างไร',
    en:'Imagine turning a few pages ahead. In this story, something small you begin today slowly leads to a place to belong, work that feels like yours, and more freedom to choose. Here is how those chapters might unfold.'
  },
  note:{
    th:'เรื่องเล่าสมมติเพื่อความบันเทิง ช่วงอายุเป็นส่วนหนึ่งของเรื่อง ไม่ใช่คำยืนยันเรื่องการมีลูก ความมั่งคั่ง หรือเหตุการณ์ในชีวิต คุณเป็นคนเลือกเส้นทางของตัวเอง',
    en:'An imagined fortune for entertainment. Ages are storytelling prompts, not predictions of children, wealth, or life events. Your choices shape your path.'
  },
  chapters:{
    career:[
      story('FC01','ประตูที่เปิดจากความสามารถ','The door your talent opens',
        'วันหนึ่ง คนที่เคยเห็นผลงานเล็ก ๆ ของคุณอาจกลับมาพร้อมคำชวนที่คาดไม่ถึง งานอดิเรกหรือสิ่งที่คุณฝึกเงียบ ๆ อาจกลายเป็นบทบาทใหม่ที่ทำให้คุณกล้าบอกว่า “นี่แหละทางของฉัน” เรื่องเริ่มจากการยอมให้ใครสักคนเห็นสิ่งที่คุณทำได้',
        'Someone who once noticed a small piece of your work could return with an unexpected invitation. A quiet hobby or well-practised skill might become a role you are proud to call your own. This chapter begins when you let someone see what you can do.'),
      story('FC02','ชื่อของคุณบนสิ่งที่สร้าง','Something with your name on it',
        'ในบทนี้ คุณอาจเริ่มโครงการเล็ก ๆ กับคนที่ไว้ใจ จากโต๊ะทำงานธรรมดาไปสู่ผลงานที่มีคนบอกต่อ ความสำเร็จอาจไม่ได้มาในครั้งแรก แต่วันหนึ่งคุณจะมองสิ่งที่สร้างแล้วนึกออกว่ามันเริ่มจากความกล้าเพียงนิดเดียว',
        'You might start a small project with someone you trust. A simple desk could become the starting point of work that people recommend to each other. The first attempt may be imperfect; later, you could look at what you built and remember the tiny act of courage that began it.'),
      story('FC03','โอกาสจากที่ที่ไม่คุ้นเคย','An invitation beyond the familiar',
        'บทสนทนากับคนต่างวงการอาจพาคุณออกจากเส้นทางเดิม คุณอาจได้ใช้ความสามารถในเมืองใหม่ ทีมใหม่ หรือบทบาทที่ไม่เคยคิดถึง ภาพในบทนี้คือคุณกำลังเปิดประตูด้วยความตื่นเต้น และพบว่าประสบการณ์ที่ผ่านมาไม่ได้สูญเปล่า',
        'A conversation with someone outside your usual circle could lead you into a new city, team, or role. Imagine opening that door with a mix of nerves and excitement, then discovering that the experience you already have belongs there too.')
    ],
    family:[
      story('FF01','เสียงหัวเราะในบ้าน','A home full of laughter',
        'ถ้าการมีลูกเป็นความฝันของคุณ บทนี้ลองวาดภาพช่วงที่คุณอาจได้ต้อนรับเด็กคนหนึ่งเข้ามาในชีวิต มีทั้งนิทานก่อนนอนและเสียงหัวเราะจากเรื่องเล็ก ๆ หากคุณเลือกชีวิตอีกแบบ บ้านนี้ก็อาจอบอุ่นด้วยคู่ชีวิต เพื่อน หรือครอบครัวที่คุณเลือกเอง',
        'If becoming a parent is a dream of yours, this chapter imagines a time when you might welcome a child into your life: bedtime stories, tiny discoveries, and laughter over ordinary things. If you choose a different path, that same warmth could come from a partner, close friends, or your chosen family.'),
      story('FF02','ที่นั่งเพิ่มอีกหนึ่งที่','One more place at the table',
        'ลองนึกถึงโต๊ะอาหารที่มีที่นั่งเพิ่มขึ้น หากคุณอยากมีลูก เรื่องราวนี้อาจเป็นบทเริ่มต้นของการเลี้ยงดูเด็กคนหนึ่ง หรืออาจเป็นการเปิดบ้านรับคนที่คุณรักในรูปแบบอื่น ความหมายของบทนี้อยู่ที่ความผูกพัน ไม่ได้ขึ้นอยู่กับว่าครอบครัวต้องมีหน้าตาแบบไหน',
        'Picture one more place at your table. If you want children, this could be the imagined beginning of raising a child. It could also mean making room for someone you love in another way. The heart of this chapter is belonging, whatever shape your family takes.'),
      story('FF03','ชีวิตประจำวันที่กลายเป็นความทรงจำ','Ordinary days, lasting memories',
        'เรื่องเล่าพาคุณไปถึงบ้านที่คุณอยากกลับในตอนเย็น ถ้าคุณเลือกเส้นทางการมีลูก อาจมีเด็กคนหนึ่งรอฟังเรื่องราวของคุณอยู่ หรืออาจเป็นคู่ชีวิตและเพื่อนสนิทที่แบ่งปันมื้ออาหาร ช่วงเวลาธรรมดาเหล่านี้อาจกลายเป็นความทรงจำที่คุณรักที่สุด',
        'The story brings you to a home you look forward to returning to. If you choose parenthood, there might be a child waiting to hear about your day; another version holds a partner and dear friends sharing dinner. These ordinary evenings could become your favourite memories.')
    ],
    connection:[
      story('FN01','คนรุ่นใหม่ที่มีคุณเป็นแรงใจ','Someone finds courage in you',
        'คนที่อายุน้อยกว่าอาจเข้ามาขอคำแนะนำ และค่อย ๆ กลายเป็นคนสำคัญในชีวิตคุณ อาจเป็นคนในครอบครัว เพื่อน หรือคนที่คุณช่วยสอน เรื่องเล่าวาดภาพโต๊ะอาหารที่มีเรื่องใหม่ให้ฟัง และความรู้สึกว่าคุณยังมีสิ่งดี ๆ ให้แบ่งปันอีกมาก',
        'A younger person might ask for your guidance and gradually become an important part of your life: a relative, friend, or someone you mentor. Imagine a table with new stories to hear, and the feeling that you still have so much to share.'),
      story('FN02','บ้านที่รวมคนที่รัก','A place for your people',
        'คุณอาจได้เป็นคนชวนทุกคนกลับมาพบกันอีกครั้ง การรวมตัวเล็ก ๆ อาจกลายเป็นธรรมเนียมที่คนรอคอย ไม่ว่าจะเป็นญาติ เพื่อน หรือครอบครัวที่เลือกเอง ความอบอุ่นในบทนี้มาจากการมีที่ให้กันเสมอ',
        'You could become the person who brings everyone together again. A small gathering might grow into a tradition people look forward to. Relatives, friends, or chosen family: the warmth in this chapter comes from making room for each other.')
    ],
    wealth:[
      story('FW01','เงินล้านแรกจากสิ่งเล็ก ๆ','A small beginning, a million-baht dream',
        'ในภาพฝันของบทนี้ ผลงานที่คุณค่อย ๆ สร้างอาจเติบโตจนพาไปถึงทรัพย์สินหนึ่งล้านบาท วันสำคัญอาจเงียบกว่าที่คิด คุณนั่งดูตัวเลขแล้วนึกถึงจุดเริ่มต้นเล็ก ๆ ความมั่งคั่งในเรื่องไม่ได้มีแค่ตัวเลข แต่รวมถึงเวลาที่เลือกใช้กับคนที่รักได้มากขึ้น',
        'In this imagined chapter, something you steadily build could grow into your first million baht in assets. The moment might be quieter than expected: you looking at a number and remembering the small beginning behind it. The real luxury in this story is having more time to spend with people you love.'),
      story('FW02','เมื่อความสามารถออกดอกผล','When your craft bears fruit',
        'เรื่องเล่าจินตนาการถึงวันที่ความสามารถที่เคยมีคนเห็นเพียงไม่กี่คนกลายเป็นงานที่มีคนต้องการ คุณอาจไปถึงหลักล้านบาทจากสิ่งที่สร้างมาหลายปี ภาพปลายทางคือพื้นที่หายใจที่กว้างขึ้น และโอกาสเลือกทำสิ่งที่มีความหมายกับคุณ',
        'Imagine a day when a skill once noticed by only a few people becomes work others seek out. In this version of the story, years of making something worthwhile could lead to a million-baht milestone. The scene ends with more breathing room and a chance to choose work that matters to you.'),
      story('FW03','ความสำเร็จที่แบ่งปันได้','Success with room to share',
        'ในเรื่องเล่านี้ โครงการที่เริ่มจากความสนใจอาจกลายเป็นความสำเร็จระดับล้านบาท คุณอาจได้ฉลองด้วยมื้ออาหารธรรมดากับคนที่อยู่ข้างกันตั้งแต่เริ่ม และพบว่าความภูมิใจที่สุดคือการมีพอที่จะดูแลชีวิตตัวเองพร้อมแบ่งปันให้คนอื่น',
        'In this story, a project that began with curiosity could become a million-baht success. You might celebrate with an ordinary meal beside the people who were there at the start. What stays with you is the feeling of having enough to care for your own life and share something with others.')
    ],
    legacy:[
      story('FL01','อิสระในแบบของคุณ','Freedom on your own terms',
        'บทต่อไปอาจเริ่มด้วยเช้าที่คุณไม่ต้องรีบร้อน คุณเลือกออกเดินทาง เรียนสิ่งใหม่ หรือใช้เวลากับคนสำคัญได้มากขึ้น เมื่อมองกลับมา สิ่งที่มีค่าที่สุดอาจเป็นชีวิตที่ค่อย ๆ ออกแบบให้เข้ากับตัวเอง',
        'A later chapter might open on an unhurried morning. You could choose a journey, a new thing to learn, or more time with someone important. Looking back, the most valuable thing may be a life you gradually shaped to fit you.'),
      story('FL02','เรื่องของคุณเป็นแรงบันดาลใจ','Your story becomes someone’s beginning',
        'วันหนึ่งอาจมีคนบอกคุณว่า “เพราะเรื่องของคุณ ฉันเลยกล้าลอง” สิ่งที่คุณผ่านมาจึงกลายเป็นของขวัญให้คนอีกคน บทนี้ไม่ได้จบลงที่ความสำเร็จของคุณคนเดียว แต่เปิดทางให้เรื่องราวใหม่เริ่มต้นขึ้น',
        'One day, someone might tell you, “Your story made me brave enough to try.” What you lived through could become a gift to another person. This chapter does not end with your own success; it leaves a door open for a new story to begin.')
    ]
  }
};
