// Original Thai/English editorial guidance. User-selected context, not inferred psychology.
// Inspired by goal / obstacle / if-then planning; this is not a validated WOOP intervention.
const b=(th,en)=>({th,en});
const advice=(watchTh,watchEn,planTh,planEn)=>({watch:b(watchTh,watchEn),plan:b(planTh,planEn)});
module.exports={
  version:'context-th-en-001',
  source:{title:'WOOP: wish, outcome, obstacle and plan',url:'https://woopmylife.org/en/practice'},
  supports:[
    {id:'balanced',title:b('ดูภาพรวมก่อน','A balanced view')},
    {id:'preparation',title:b('อยากเตรียมตัวให้พร้อม','Feeling prepared')},
    {id:'confidence',title:b('อยากมั่นใจขึ้น','Feeling more confident')},
    {id:'communication',title:b('อยากสื่อสารให้เข้าใจกัน','Communicating clearly')}
  ],
  occasions:[
    {
      id:'general',title:b('วันทั่วไป','An ordinary day'),
      goal:b('เลือกเรื่องเล็กหนึ่งเรื่องที่อยากให้คืบหน้า โดยเผื่อพื้นที่ให้สิ่งที่คาดไม่ถึง','Choose one small thing you want to move forward, leaving room for the unexpected.'),
      outlooks:{
        opening:b('คำอ่านสำหรับวันที่เลือกชวนให้เปิดรับทางเลือกเล็ก ๆ เรื่องที่ยังไม่แน่ใจอาจเริ่มเห็นทางเมื่อได้ลองหนึ่งขั้น โดยยังไม่ต้องตัดสินใจทั้งหมด','The reading for this day invites a small opening. One trial step may make an uncertain option clearer without committing to everything.'),
        growing:b('วันนั้นชวนให้ต่อยอดเรื่องที่เริ่มเดินหน้าแล้ว ความคืบหน้าเล็กน้อยที่ทำได้จริงอาจให้กำลังใจมากกว่าการเพิ่มเป้าหมายใหม่หลายเรื่อง','The reading for this day favours building on something already moving. A manageable gain may feel more encouraging than adding several new goals.'),
        review:b('คำอ่านสำหรับวันที่เลือกชวนให้ดูรายละเอียดอีกครั้ง หากบางเรื่องช้ากว่าที่หวัง ลองใช้จังหวะนั้นตรวจข้อมูลและปรับแผนหนึ่งจุด','The reading for this day invites a second look at the details. If something moves slowly, use the pause to check information and adjust one part of the plan.'),
        steady:b('วันนั้นชวนให้รักษาจังหวะที่พอดีกับตัวเอง สิ่งเรียบง่ายที่ทำได้ต่อเนื่องอาจมีความหมายกว่าการเร่งให้ทุกเรื่องเห็นผลทันที','The reading for this day invites a sustainable pace. A simple action you can maintain may matter more than pressing every issue for an immediate result.')
      },
      advice:{
        balanced:advice('การรับหลายเรื่องพร้อมกันอาจทำให้มองไม่เห็นสิ่งที่สำคัญจริง ๆ','Taking on too much at once can obscure what matters most.','ถ้ามีเรื่องใหม่เข้ามา ให้จดไว้ก่อน แล้วกลับมาทำสิ่งสำคัญหนึ่งอย่างให้จบ','If a new demand arrives, note it down and return to finishing one priority.'),
        preparation:advice('การวางแผนแน่นเกินไปอาจทำให้เรื่องเล็กที่เปลี่ยนกลายเป็นความกดดัน','An overfilled plan can make a small change feel disproportionately difficult.','ถ้าแผนสะดุด ให้เลือกงานที่จำเป็นที่สุดหนึ่งชิ้น และเลื่อนสิ่งที่รอได้','If the plan is disrupted, choose the one essential task and move what can wait.'),
        confidence:advice('ความรู้สึกไม่พร้อมไม่จำเป็นต้องแปลว่าคุณทำขั้นแรกไม่ได้','Feeling unready does not necessarily mean you cannot take the first step.','ถ้าลังเล ให้ย่อสิ่งที่ต้องทำเป็นขั้นที่ใช้เวลา 5 นาที แล้วเริ่มจากตรงนั้น','If you hesitate, shrink the task to a five-minute step and start there.'),
        communication:advice('คำตอบสั้น ๆ อาจมีหลายเหตุผล ควรถามเพิ่มก่อนสรุปเจตนา','A brief reply can have several explanations; ask before deciding what it means.','ถ้าไม่แน่ใจว่าเข้าใจตรงกัน ให้สรุปสิ่งที่ได้ยินแล้วถามว่าเข้าใจถูกไหม','If the meaning is unclear, summarise what you heard and ask whether you understood correctly.')
      }
    },
    {
      id:'interview',title:b('สัมภาษณ์งาน','Job interview'),
      goal:b('เล่าให้เห็นว่าคุณทำอะไรได้ และเก็บข้อมูลว่างานนี้เหมาะกับคุณหรือไม่','Show what you can contribute and learn whether the role is a good fit for you.'),
      outlooks:{
        opening:b('ในเรื่องสัมภาษณ์ ธีมเริ่มต้นชวนให้เปิดบทสนทนาด้วยตัวอย่างที่ชัดหนึ่งเรื่อง โอกาสในวันนั้นอยู่ที่การทำให้อีกฝ่ายเห็นวิธีคิดของคุณ และการได้รู้จักงานมากขึ้น','For an interview, the opening theme invites one clear example to start the conversation. The opportunity on this day is to make your thinking visible and learn more about the role.'),
        growing:b('ในเรื่องสัมภาษณ์ ธีมเติบโตชวนให้ต่อยอดจากประสบการณ์ที่มี เล่าทั้งสิ่งที่คุณลงมือทำ ผลที่เกิดขึ้น และสิ่งที่เรียนรู้ เพื่อให้การสนทนามีน้ำหนักจากเรื่องจริง','For an interview, the growth theme invites you to build on your experience. Describe your actions, their results and what you learned so the conversation rests on concrete examples.'),
        review:b('ในเรื่องสัมภาษณ์ ธีมทบทวนชวนให้ฟังคำถามจนจบและถามกลับเมื่อโจทย์ไม่ชัด การหยุดคิดสั้น ๆ เป็นพื้นที่ให้เรียบเรียงคำตอบ ไม่ใช่สัญญาณว่าคุณเสียโอกาสแล้ว','For an interview, the review theme invites careful listening and clarification. A short thinking pause gives you room to organise an answer; it does not mean the opportunity is lost.'),
        steady:b('ในเรื่องสัมภาษณ์ ธีมประคองชวนให้ใช้จังหวะที่เป็นธรรมชาติ พูดถึงสิ่งที่ทำได้จริง และเปิดพื้นที่คุยเรื่องความคาดหวังของทั้งสองฝ่าย โดยไม่ต้องรับปากเกินกำลัง','For an interview, the steady theme invites a natural pace. Explain what you can deliver and discuss expectations on both sides without overpromising.')
      },
      advice:{
        balanced:advice('สีหน้าหรือคำถามยากของผู้สัมภาษณ์เพียงครั้งเดียว ยังบอกผลการสมัครไม่ได้','One expression or difficult question from an interviewer cannot tell you the hiring outcome.','ถ้าเจอคำถามที่ไม่คาดไว้ ให้ขอเวลาคิดสั้น ๆ แล้วตอบด้วยตัวอย่างที่เกี่ยวข้องที่สุด','If an unexpected question comes up, ask for a brief moment to think, then use your most relevant example.'),
        preparation:advice('การท่องคำตอบทุกคำอาจทำให้ปรับยากเมื่อคำถามเปลี่ยน','Memorising every word can make it harder to adapt when a question changes.','ถ้าถูกถามถึงประสบการณ์ ให้เลือกหนึ่งในสองตัวอย่างที่เตรียมไว้ แล้วเล่าสถานการณ์ สิ่งที่ทำ และผลที่เกิดขึ้น','If asked about your experience, choose one of two prepared examples and explain the situation, your action and the result.'),
        confidence:advice('การตื่นเต้นไม่ได้บอกว่าคุณขาดความสามารถ และไม่จำเป็นต้องตอบอย่างสมบูรณ์แบบทุกข้อ','Feeling nervous does not establish a lack of ability, and every answer need not be perfect.','ถ้าเริ่มพูดเร็วเพราะตื่นเต้น ให้เว้นจังหวะ หายใจตามปกติ แล้วค่อยเล่าประเด็นหลักหนึ่งข้อ','If nerves make you rush, pause for a comfortable breath and restart with one main point.'),
        communication:advice('คำตอบยาวอาจทำให้จุดเด่นของคุณหายไป ลองเชื่อมแต่ละตัวอย่างกับสิ่งที่งานต้องการ','A long answer can bury your strengths. Connect each example to something the role requires.','ถ้าคำถามกว้าง ให้ถามว่าอยากฟังด้านใดเป็นพิเศษ แล้วตอบประเด็นนั้นก่อน','If a question is broad, ask which aspect they would like to hear about and address that first.')
      }
    },
    {
      id:'date',title:b('นัดเดต / พบคนที่สนใจ','A date / meeting someone'),
      goal:b('รู้จักกันเพิ่มขึ้น และสังเกตว่าคุณรู้สึกสบายใจ เป็นตัวเอง และได้รับความเคารพหรือไม่','Get to know each other and notice whether you feel comfortable, yourself and respected.'),
      outlooks:{
        opening:b('ในเรื่องนัดเดต ธีมเริ่มต้นชวนให้พบกันด้วยความอยากรู้จัก ลองเปิดพื้นที่ให้เรื่องเล่าธรรมดา ๆ โดยยังไม่ต้องหาคำตอบทันทีว่าความสัมพันธ์จะไปถึงไหน','For a date, the opening theme invites curiosity. Make room for ordinary stories without needing to decide immediately where the connection will lead.'),
        growing:b('ในเรื่องนัดเดต ธีมเติบโตชวนให้ต่อบทสนทนาจากสิ่งที่อีกฝ่ายแบ่งปัน ความใส่ใจเล็ก ๆ และการมีพื้นที่ให้ทั้งสองคนพูด อาจช่วยให้เห็นความเข้ากันได้ชัดขึ้น','For a date, the growth theme invites you to build on what the other person shares. Small acts of attention and room for both voices may make compatibility clearer.'),
        review:b('ในเรื่องนัดเดต ธีมทบทวนชวนให้ดูทั้งคำพูด การกระทำ และความรู้สึกของคุณเอง หากมีเรื่องไม่ชัด ค่อยถามอย่างตรงไปตรงมาโดยไม่ต้องรีบตีความแทนอีกฝ่าย','For a date, the review theme invites attention to words, actions and your own comfort. Ask about uncertainty directly rather than deciding what the other person must mean.'),
        steady:b('ในเรื่องนัดเดต ธีมประคองชวนให้ปล่อยความสัมพันธ์เดินในจังหวะที่ทั้งคู่สบายใจ ช่วงเงียบสั้น ๆ ไม่จำเป็นต้องเป็นปัญหา และคุณไม่ต้องพยายามสร้างความประทับใจตลอดเวลา','For a date, the steady theme invites a pace that feels comfortable to both people. A brief silence need not be a problem, and you need not perform throughout the meeting.')
      },
      advice:{
        balanced:advice('ความประทับใจแรกหรือการตอบข้อความช้าเพียงครั้งเดียว ยังไม่พอจะสรุปใจของอีกฝ่าย','A first impression or one delayed message is not enough to determine another person’s feelings.','ถ้าอยากรู้จักต่อ ให้บอกอย่างเรียบง่ายว่าคุณสนุกกับการเจอกัน แล้วถามว่าอีกฝ่ายอยากนัดอีกไหม','If you would like to meet again, simply say you enjoyed the meeting and ask whether they would like another date.'),
        preparation:advice('การวางบทสนทนาไว้ทุกช่วงอาจทำให้คุณมัวแต่จำแผนจนไม่ได้ฟัง','Planning every part of the conversation can distract you from listening.','ถ้าไม่รู้จะเริ่มคุยอะไร ให้ถามถึงเรื่องเล็กที่อีกฝ่ายชอบช่วงนี้ แล้วแบ่งปันเรื่องของคุณด้วย','If you are unsure how to start, ask about something they have enjoyed lately and share something of your own.'),
        confidence:advice('คุณไม่จำเป็นต้องเห็นด้วยทุกเรื่องเพื่อให้เป็นที่ชอบ สังเกตด้วยว่าคุณได้เป็นตัวเองหรือไม่','You do not need to agree with everything to be liked. Notice whether there is room to be yourself.','ถ้าเริ่มกังวลว่าจะพูดถูกใจไหม ให้กลับมาฟังสิ่งที่อีกฝ่ายพูด แล้วตอบจากความรู้สึกจริงอย่างสุภาพ','If you start worrying about saying the right thing, return to listening and respond honestly and kindly.'),
        communication:advice('การเดาใจหรือฝืนตอบเรื่องที่ยังไม่พร้อม อาจทำให้คุณละเลยขอบเขตของตัวเอง','Guessing feelings or answering something before you are ready can pull you away from your own boundaries.','ถ้าหัวข้อไหนทำให้ไม่สบายใจ ให้บอกว่าอยากคุยเรื่องนั้นเมื่อพร้อม แล้วเสนอหัวข้ออื่น','If a topic feels uncomfortable, say you would prefer to discuss it when ready and suggest another topic.')
      }
    }
  ],
  weekly:{
    opening:{title:b('เปิดพื้นที่ให้สิ่งใหม่','Make room for something new'),goal:b('เลือกโอกาสหนึ่งอย่างที่อยากลองในช่วงวันที่แสดง','Choose one opportunity to explore during the dates shown.'),...advice('ความอยากเริ่มหลายอย่างอาจทำให้ไม่มีเวลาสำหรับเรื่องที่สำคัญจริง ๆ','Starting several things at once can leave little time for the one that matters.','ถ้ามีโอกาสใหม่เข้ามา ให้เลือกขั้นทดลองเล็ก ๆ ที่ทำได้ แล้วค่อยทบทวนว่าจะไปต่อไหม','If a new opportunity appears, choose a small trial step and then review whether to continue.')},
    growing:{title:b('ต่อยอดสิ่งที่กำลังเดินหน้า','Build on existing progress'),goal:b('เลือกสิ่งที่เริ่มได้ผลหนึ่งเรื่อง และให้เวลามันอย่างสม่ำเสมอ','Choose one thing that is beginning to work and give it regular attention.'),...advice('การตอบรับทุกโอกาสอาจเบียดเวลาของสิ่งที่กำลังไปได้ดี','Saying yes to every opportunity can crowd out what is already going well.','ถ้ามีงานเพิ่มเข้ามา ให้ตรวจเวลาที่เหลือก่อนรับปาก และรักษาเวลาของเป้าหมายหลักไว้','If more work arrives, check your available time before agreeing and protect time for your main goal.')},
    review:{title:b('ปรับหนึ่งจุดให้ชัดขึ้น','Make one useful adjustment'),goal:b('เลือกเรื่องค้างที่ต้องการความชัดเจน แล้วหาข้อมูลเพิ่มหนึ่งอย่าง','Choose one unresolved matter and find one piece of information that would clarify it.'),...advice('ความล่าช้าอาจทำให้อยากสรุปเร็ว ทั้งที่ข้อมูลยังไม่ครบ','A delay can tempt you to settle on an explanation before you have enough information.','ถ้ายังไม่ได้คำตอบ ให้จดสิ่งที่รู้กับสิ่งที่ยังไม่รู้ แล้วถามผู้เกี่ยวข้องให้ตรงประเด็น','If an answer is missing, separate what you know from what you do not and ask the relevant person a clear question.')},
    steady:{title:b('รักษาจังหวะที่พอดี','Keep a sustainable rhythm'),goal:b('ดูแลเรื่องสำคัญหนึ่งอย่าง พร้อมเว้นเวลาพักให้ตัวเอง','Care for one priority while leaving yourself time to rest.'),...advice('การเทียบจังหวะตัวเองกับคนอื่นอาจทำให้เร่งเกินกำลัง','Comparing your pace with other people’s can push you beyond a sustainable workload.','ถ้าเริ่มรู้สึกว่าทุกอย่างเร่งด่วน ให้เลือกสิ่งจำเป็นหนึ่งเรื่อง และกำหนดเวลาพักไว้ด้วย','If everything starts to feel urgent, choose one essential task and schedule a pause as well.')}
  }
};
