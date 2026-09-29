var ImgOrlW ,ImgOrlH ;
 
$(window).on('load',function(){ 
 
  // 顯示圖片區  讀取圖片
  if($('#image_display').length > 0 && location.search.length){
    let display_mode = $('.display_object_area').attr('mode');
	Built_Image_Area(display_mode);
  }
  
   
  
  // 顯示列印區影像，跳轉
  if($('#act_image_print').length){
	$('#act_image_print').click(function(){
      $('#ImageObject').on('error',function() {
        system_message_alert('影像錯誤');
        return false;
	  });  
	  var image_address = $('#ImageObject').attr('src');
	  window.open('index.php?act=Display/ciprint/'+Base64M.encode(image_address));
	});
  }
  
  // image saved
  if($('#act_image_saved').length){
	$('#act_image_saved').click(function(){
      $('#ImageObject').on('error',function() {
        system_message_alert('影像錯誤');
        return false;
	  });  
	  var image_address = $('#ImageObject').attr('src')+'/original';
	  $(this).attr('href',image_address);
	});
  }
  
    // 開啟圖檔申請選單 #202410VUPD
    $('#act_image_require').click(function(){
	      
	    let show_flag = parseInt($(this).attr('show'));
		let show_swap = show_flag ? 0 : 1 ;
		$(this).attr('show',show_swap);
		
		
    })
  
  
  
   
  //-- rotate image
  $('.act_rotate_image').click(function(){
    var rotate_to = $(this).attr('mode')=='right' ? 90 : -90;
  
    var iobj    = $('#ImageObject');
    var deg_now = parseInt(iobj.attr('rot'));
	var deg_to  = parseInt((deg_now+rotate_to)%360);
    $('#ImageObject').css( 'transform','rotate('+deg_to+'deg)').attr('rot',deg_to);
  });
  
  
  var dobj_mouse_wheel_scale_function_flag = false;
  var dobj_mouse_move_scale_function_flag  = false;  // 滑鼠控制倍率
  
  if($('#obj_size_slider').length > 0){
   
    var ImgBoxPosT,ImgBoxPosL,ImgBoxW,ImgBoxH; 
   
    ImgBoxPosT = $( ".obj_view" ).offset().top;
    ImgBoxPosL = $( ".obj_view" ).offset().left;
    ImgBoxW    = $( ".obj_view" ).width();
    ImgBoxH    = $( ".obj_view" ).height();
    
    $( "#obj_size_slider" ).mousemove(function(event){
      if(!dobj_mouse_move_scale_function_flag){
		return false;  
	  }
	  if( $(this).val() > dobj_mouse_move_scale_function_flag ){
		dobj_mouse_move_scale_function_flag = $(this).val();
		resizedobj(event,1);  
	  }else if($(this).val() < dobj_mouse_move_scale_function_flag){
		dobj_mouse_move_scale_function_flag = $(this).val();
		resizedobj(event,-1);  
	  }
	});
	
	// 綁定起始倍率
	$("#obj_size_slider").on('mousedown',function(){
		dobj_mouse_move_scale_function_flag = $(this).val();
	});
	
	// 綁定取消倍率
	$(".page_scale").on('mouseup',function(){
		dobj_mouse_move_scale_function_flag = false;
	});
  }
 
  
  $('#image_display').mousewheel(function(event, delta){
	resizedobj(event,delta);
  });  
  
  
  
  function resizedobj(evt,delta){
	
	
	var e = evt || window.event; 
	var container = $('#image_display').offset();
	var imgobject = $("#ImageObject" ).offset();
	
	var mouseposition = {'x':e.pageX,'y':e.pageY};
	var imageposition = {'x':imgobject.left,'y':imgobject.top,'w':$( "#ImageObject" ).width(),'h':$( "#ImageObject" ).height()};
	
	// 設定影像大小
	var ImgRate = parseInt($('#obj_size_slider').val());
	ImgRate = (delta<0) ? ImgRate-10 : ImgRate+10;
	if(ImgRate>=300) ImgRate = 300;
	if(ImgRate<=70) ImgRate = 70;
	
	$( "#ImageObject" ).css({'width':parseInt(ImgOrlW * ImgRate / 100)+'px','height':parseInt(ImgOrlH * ImgRate / 100)+'px'});
	 
	// 設定slider
	$('#obj_size_slider').val(ImgRate);
	if((ImgRate/100).toString().length == 1){
	  $( "#scale_info" ).html( ImgRate/100 +".0" );
	}else{
	  $( "#scale_info" ).html( ImgRate/100 );
	}  
	 
	//修正如果圖片 跑出影像框  則定位於 框左上角
	var ImgPosNowT = $( "#ImageObject" ).offset().top;
	var ImgPosNowL = $( "#ImageObject" ).offset().left;
	var ImgNewW    = $( "#ImageObject" ).width()  
	var ImgNewH    = $( "#ImageObject" ).height()
	
	if(  mouseposition.y<=$('#image_display').height() &&  mouseposition.x >= imageposition.x && mouseposition.x<= imageposition.x+imageposition.w && mouseposition.y >= imageposition.y && mouseposition.y <= imageposition.y+imageposition.h ){
	  // 滑鼠焦點在圖片內
	  var mouseimgpos = {'x':mouseposition.x-imageposition.x,'y':mouseposition.y-imageposition.y}
	  var new_position_x = ImgPosNowL- ((mouseimgpos.x * ImgNewW / imageposition.w) - mouseimgpos.x);
	  var new_position_y = ImgPosNowT- ((mouseimgpos.y * ImgNewH / imageposition.h) - mouseimgpos.y);
	  $( "#ImageObject" ).offset( {top:new_position_y,left:new_position_x} ); 
	  
	}else{
	  $( "#ImageObject" ).offset( {top:ImgBoxPosT,left:ImgBoxPosL+parseInt((ImgBoxW-ImgNewW)/2)} ); 
	}
  }
  
  
  // reference select
  if($('input#reference_string').length >0 ){
    $('input#reference_string').mouseenter(function(){
	  $(this).focus().select();
	});
  }
  
  // 投影顯示區  meta 卷軸
  if($('#Project_Mode_Meta').length){
	// 切換重新設定 scroll	
	var setting = {
      autoReinitialise: true,
      showArrows: false
    }; 
	
	// 設定 jScrollPane
	$('#Project_Mode_Meta').jScrollPane(setting);	 
  }

  
  // app 區卷軸
  if($('.app_body_block').length){
    var setting = {
      autoReinitialise: true,
      showArrows: false
    }; 
	$('.app_body_block').jScrollPane(setting);	 
  }
  
  /*******-----  人名權威 Function -----*******/
  $(document).on('click','persona',function(event){
    $('.system_app_area').css('z-index',500);
    $('#authname_reference').css('z-index',501);
	var person = $(this).html();
	$('#authname_reference').show('slide',{direction:"right"},500,AuthNameApp(person));
  });
  
  $(document).on('click','.auth_link',function(event){
    $('.system_app_area').css('z-index',500);
    $('#authname_reference').css('z-index',501);
	var person = $(this).attr('name');
	$('#authname_reference').show('slide',{direction:"right"},500,AuthNameApp(person));
  });
  
  
  function AuthNameApp(auth_name){
    
	var jsapi = $('#authname_reference').find('.app_body_block').data('jsp')
	jsapi.scrollToY(0);
	
	var condition = auth_name.replace(/<\/?(?!\!)[^>]*>/gi, '');
	$.ajax({
      url: 'http://ahdasapp.oo10.co/app.php?callback=?',
	  type:'POST',
	  async: false,
      dataType:'jsonp',
	  data: {act:'auth_get',target:encodeURIComponent(condition)},
	  jsonp: 'getAjaxData',
	  beforeSend:function(){ $('#authname_loading').css('display','block'); },
	  error: function(xhr, ajaxOptions, thrownError) { console.log(thrownError) },
	  success: function(response) {
	    $('.auth_value').empty();
		if(response.action){
		  $('#auth_name').html(response.data.auth.lastName+response.data.auth.firstName);
		  $('#auth_live').html(response.data.auth.live);
		  $('#auth_story').html(response.data.auth.story);
		
		  if(response.data.auth.source){
		    $('#auth_source').html("<div class='source_title'>資料來源：</div><div class='source_content'>"+response.data.auth.source+"</div>");  
		  }
		
		  if(response.data.relation.length){
		    $('#relation_count').html('('+response.data.relation.length+')');
		    $.each(response.data.relation , function(key,rela ){
		      $('#auth_relation').append("<div class='list_term tr_like'><span class='term_rela'>"+rela.relation+"</span> <span class='term_name'>"+rela.relative+"</span></div>")
		    });
		  }
		
		  if(response.data.education.length){
		    $('#education_count').html('('+response.data.education.length+')');
		    $.each(response.data.education , function(key,educat ){
		      $('#auth_education').append("<div class='list_term tr_like'><span class='term_date'>"+educat.wBDate+"</span> <span class='term_info'>"+educat.education+"</span></div>")
		    });
		  }
		
		  if(response.data.experience.length){
		    $('#experience_count').html('('+response.data.experience.length+')');
		    $.each(response.data.experience , function(key,exper ){
		      $('#auth_experience').append("<div class='list_term tr_like'><span class='term_date'>"+exper.wBDate+"</span> <span class='term_info'>"+exper.title+"</span></div>")
		   });
		  }
		}else{
		  $('#auth_name').html('查無此人');
		  $('#auth_live').html(' - ');
		}
		$('#authname_loading').css('display','none');
	  }
    });
  }
  
  
  // 關閉 APP 區塊
  $('.close_option,#report_cancel,#auth_close,#info_close').bind('click',function(){
	$(this).parent().parent().hide('slide',{direction:"right"},500).css('z-index',500).children('.form_block').empty();
  });
   
  
  // 打包下載影像
  if($('#act_image_package').length){
	
	$('#act_image_package').click(function(){
	
	 
	
	  $('#ImageObject').on('error',function() {
        system_message_alert('影像錯誤');
        return false;
	  });  
	  
	  
	  let range = prompt("請輸入下載影像範圍，每次下載範圍最多50張為上限\n範圍設定範例：1-5,6-7(使用','分隔)","1-");
	  
	  if(!range){
		return false;  
	  }
	  
	  if(!confirm("確定要下載本件影像 "+range+" 頁嗎？\n本件下將包含多個頁面，格式為PDF檔案")){
	    return false;
	  }
	  
	  var access_refer = location.href.split('/')
	  var acctss_id    = access_refer.pop().replace(/#.*?$/,'')
	  
	  $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Display/package/'+acctss_id+'/'+range},
		  beforeSend: 	function(){ system_loading();  },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(response.action){  
			  location.href='index.php?act=Display/download/'+response.data // 只能在本地視窗開啟
			}else{
			  //newWindow.close();
			  system_message_alert('',response.info);
			}
		  },
		  complete:		function(){   }
	  }).done(function() { system_loading();   });	  
	});
  }
  
  
  //-- 大圖申請
  $('.request_target').click(function(){
	
	if(!$(this).attr('item')){
		system_message_alert('申請目標錯誤');
        return false;
	} 
	
	let masterdom = $(this).parents('li');	
	let active_dom = $(this);
	let method = parseInt(masterdom.attr('pick')) ? 'del' : 'add';
	
	$.ajax({
		url: 'index.php',
		type:'POST',
		dataType:'json',
		data: {act:'Archive/dorequeue/'+method+'/'+active_dom.attr('range')+'/'+$('.image_require_select').attr('applykey')+'/'+active_dom.attr('item')},
		beforeSend: function(){  active_loading(active_dom,'initial'); }
	}).done(function(response) {
		if(!response.action){
		  system_message_alert('',response.info);
		  return true;
		}
		
		masterdom.attr('pick',(method=='add'?1:0));
		
	}).fail(function(xhr, ajaxOptions, thrownError) {
		console.log( ajaxOptions+" / "+thrownError);
	}).always(function(r){
		 active_loading(active_dom ,  r.action  );
	});

   
	
	
	
	  
	  
  })
  
  
  
  
  
  
});

/*****------以上為 document load 後加載js ----- *******/
/******************************************************/
  
  
 
  
  
  /******* ----- 讀取影像資料 ----- *******/
  function Built_Image_Area(obj_type){
  
    obj_type = obj_type ? obj_type : 'img';
   
    var Link_Part = location.search.match(/act=Display\/(.*?)\/(\d+[a-zA-Z0-9\_\-=\+]{7,7})/);
       
    if((Link_Part[1] == 'image'  || Link_Part[1] == 'print' || Link_Part[1] == 'video') && Link_Part[2].length){
   
      var ObjectCode = Link_Part[2];
	  var PageCode   = location.hash.replace('#','')
  
	  $.ajax({
        url: 'index.php',
	    type:'POST',
	    dataType:'json',
	    data: {act:'Display/built/'+ObjectCode+'/'+PageCode},
        beforeSend:function(){
	      $('#btinfo_pageload').css({'display':'block','opacity':0.8});
	    },
	    error: function(xhr, ajaxOptions, thrownError) {
		  console.log(thrownError)
		},
		success: function(response) {
		  //console.log(response)
		  if(response.action){
		    
 		    var object_built = response.data;
			
			
			if(!parseInt(object_built.print_option)){
				$('#act_image_print').hide();
				$('#act_image_saved').hide();
				$('#pgrequest').hide(); 
			}else{
				$('#pgrequest').show(); 
			}
			
			if(obj_type!='img'){
				$('#pgrequest').hide(); 
			}
			
			
			switch(obj_type){
		      case 'img':
				 
				$('#img_num').html(object_built.page_count);
				$('#image_access_count').html(object_built.image_access_count);
				//$('#ref_address').text(location.href);
				$('#image_display').empty().append("<img id='ImageObject' class='ImageObject' src='index.php?act=Display/loadimg/"+object_built.page_code_now+"' style='' galleryimg='no' drag='no' onContextMenu='return false' rot='0' />").
					children('img').on('load',function(){
					  
					  var BlockW = $('#image_display').width();
					  var BlockH = $('#image_display').height();
					  
					  if($(".ImageObject" ).height() > $(".ImageObject" ).width()){
						$(".ImageObject" ).css({'width':'','height':BlockH+'px'});
					  }else{
						$(".ImageObject" ).css({'width':BlockW+'px','height':''});
					  }
					 
					  ImgOrlW = $(".ImageObject" ).width();
					  ImgOrlH = $(".ImageObject" ).height();
					  
					  
					  if(ImgOrlH > BlockH){
                        ImgOrlW = ImgOrlW * BlockH / ImgOrlH;
						ImgOrlH = BlockH;
					    $(".ImageObject" ).width(ImgOrlW);
						$(".ImageObject" ).height(BlockH);
					  }
					  
					  
					  if($("#obj_size_slider").val()>100){
					    $(".ImageObject" )
						.width(  parseInt(ImgOrlW * $("#obj_size_slider").val() /100))
						.height( parseInt(ImgOrlH * $("#obj_size_slider").val() /100)); 
					  }
					   
					  $(".ImageObject" ).offset( {top:0,left:$( ".obj_view" ).offset().left+parseInt(($( ".obj_view" ).width()-parseInt(ImgOrlW * $("#obj_size_slider").val() /100))/2)} ); 
					  $(".ImageObject" ).animate({opacity:'1'},300,function(){});
					  
					  
					  $('#btinfo_pageload').stop(true, true).css({'opacity':0,'display':'none'});
					  
					  //console.log(object_built.page_doreq)
					  
					  if($('#pgrequest').length){
						 $('#pgrequest').attr('item',object_built.page_fname).parents('li').attr('pick',object_built.page_doreq.page); 
					  }
					  if($('#itrequest').length){
						 $('#itrequest').parents('li').attr('pick',object_built.page_doreq.case);
					  }
					  
					  
					  
					  
					  
					}).draggable({
						stop: function(event, ui) {
						//alert($(".ImageObject" ).offset().top+':'+$(".ImageObject" ).offset().left);
						}
					}).click(function(event){
						var mouse = {};
						var offset = $(this).offset();
						
					    mouse.mx = event.pageX - offset.left;
						mouse.my = event.pageY - offset.top;
						mouse.px = parseInt(mouse.mx/$(this).width()*100);
						mouse.py = parseInt(mouse.my/$(this).height()*100);
						console.log(mouse.px+';'+mouse.py);
						if(parseInt(object_built.page_access_lock)){
						  
						  $.ajax({
							url: 'index.php',
							type:'POST',
							dataType:'json',
							data: {act:'Display/unlock/'+mouse.px+'/'+mouse.py},
							beforeSend:function(){
							  $('#btinfo_pageload').css({'display':'block','opacity':0.8});
							},
							error: function(xhr, ajaxOptions, thrownError) {
							  console.log(thrownError)
							},
						    success: function(response) {
							  if(!response.action){
								alert(response.info)  
							  }
							  window.location.reload(true);
							}
						  });
						
						}
						
					});
		        
				$('#img_jump').empty().unbind();
				for (page in object_built.page_list){
					var page_target = (object_built.page_list[page] == object_built.page_code_now) ? 'selected' :'' ;
					$('#img_jump').append("<option value='"+object_built.page_list[page]+"' "+page_target+" > P."+page+" </option>");
				}
		  
				$('#img_jump').one('change', function() {
					$(location).attr('hash','#'+$(this).val()).
					one('load',Built_Image_Area()).
					triggerHandler('load');
				});
		
				$('.img_botton').unbind();
				if(object_built.page_code_up != object_built.page_code_now){
					$('#img_up').one('click', function() {
					$(location).attr('hash','#'+object_built.page_code_up).
						one('load',Built_Image_Area()).
						triggerHandler('load');
					});
		  
					$('#onimg_up').one('click', function() {
					$(location).attr('hash','#'+object_built.page_code_up).
						one('load',Built_Image_Area()).
						triggerHandler('load');
					});
				}
		
				if(object_built.page_code_dw != object_built.page_code_now){
					$('#img_dw').one('click', function() {
					$(location).attr('hash','#'+object_built.page_code_dw).
						one('load',Built_Image_Area()).
						triggerHandler('load');
					//window.location.reload(true);
					});
		  
					$('#onimg_dw').one('click', function() {
					$(location).attr('hash','#'+object_built.page_code_dw).
						one('load',Built_Image_Area()).
						triggerHandler('load');
					//window.location.reload(true);
					});
				}
				
				
				$(location).attr('hash','#'+object_built.page_code_now);
				
		        break; 
				
		      case 'mp4':
			    
				let video_dom = $("<video/>").addClass('video-js');
				video_dom.attr({
					'id' : "ah-player",
					'controls'	: 1,
					'preload'	: "auto",
					'poster'	: "theme/image/logo2.png",  //video thumb
					'data-setup' : "{}",
				});
				video_dom.append('<source src="'+object_built.service_address+'" type="video/mp4"></source>');
				video_dom.append('<p class="vjs-no-js">To view this video please enable JavaScript, and consider upgrading to a web browser that<a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a></p>');
				
				$('#image_display').empty().append(video_dom);
			    
				var options = {};
				var player = videojs('ah-player', options, function onPlayerReady() {
				  
				  $('#btinfo_pageload').stop(true, true).css({'opacity':0,'display':'none'});
				  //videojs.log('Your player is ready!');
				  
				  // In this context, `this` is the player that was created by Video.js.
				  this.play();
				  
				  // How about an event listener?
				  this.on('ended', function() {
					//videojs.log('Awww...over so soon?!');
				  });
				
				});
				
				if($('#itrequest').length){
					$('#itrequest').parents('li').attr('pick',object_built.page_doreq.case);
				}
  				
			    break;
			  
			  case 'mp3':
			    
				let audio_dom = $("<audio/>").addClass('video-js');
				audio_dom.attr({
					'id' : "ah-player",
					'controls'	: 1,
					'preload'	: "auto",
					'poster'	: "./theme/image/audioframe.jpg",  //video thumb
					'data-setup' : "{}",
				});
				audio_dom.append('<source src="'+object_built.service_address+'" type="audio/mp3"></source>');
				audio_dom.append('<p class="vjs-no-js">To view this video please enable JavaScript, and consider upgrading to a web browser that<a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a></p>');
				
				$('#image_display').empty().append(audio_dom);
			    
				var options = {};
				var player = videojs('ah-player', options, function onPlayerReady() {
				  
				  $('#btinfo_pageload').stop(true, true).css({'opacity':0,'display':'none'});
				  //videojs.log('Your player is ready!');
				  
				  // In this context, `this` is the player that was created by Video.js.
				  this.play();
				  
				  // How about an event listener?
				  this.on('ended', function() {
					//videojs.log('Awww...over so soon?!');
				  });
				
				});
				
				if($('#itrequest').length){
					$('#itrequest').parents('li').attr('pick',object_built.page_doreq.case);
				}
  				
			    break;
		  
		    }
		  }else{
		    $('.obj_display').empty().append("<img id='ImageObject' class='ImageObject' src='index.php?act=Display/loadimg/fail' style='' galleryimg='no' drag='no' onContextMenu='return false' rot=0 />").
					children('img').on('load',function(){
					  
					  var BlockW = $('#image_display').width();
					  var BlockH = $('#image_display').height();
					  
					  if($(".ImageObject" ).height() > $(".ImageObject" ).width()){
						$(".ImageObject" ).css({'width':'','height':BlockH+'px'});
					  }else{
						$(".ImageObject" ).css({'width':BlockW+'px','height':''});
					  }
					 
					  ImgOrlW = $(".ImageObject" ).width();
					  ImgOrlH = $(".ImageObject" ).height();
					  
					  //$(".ImageObject" ).show();
					  $(".ImageObject" ).animate({opacity:'1'},300,function(){});
					  $('#btinfo_pageload').stop(true, true).css({'opacity':0,'display':'none'});
					  
					});
		  }  
	    
		
		} // end of ajax.success
      }); // end of ajax
    }
  }
  
  
   //-- sample open new windows and print
  /*
  function showimage() {
	var img = new Image();
	img.src = $('.ImageObject').attr('src');
	//if (typeof img== 'object') img = img.src;
    window.win = open(img.src);
    setTimeout('win.document.execCommand("Print")', 500);
  }
  
   */ 
  //-- sample regist print function
  
  (function() {
    var beforePrint = function() {
	  var ref = $('#reference_string').val();
	  if(!$('#printref').length){
	    $('.browse_member').append("<div id='printref' ><label>引用資訊：</label>"+ref+"</div>")
	  }
    };
    var afterPrint = function() {
      $('#printref').remove(); 
    };

    if (window.matchMedia) {
        var mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(function(mql) {
			if ( mql.matches ) {
                beforePrint(); 
            } else {
                afterPrint();
            }
		});
    }
    window.onbeforeprint = beforePrint;
    window.onafterprint = afterPrint;
	 
  }());
   
  
  
  /*
  function resizedobj(delta){
	var ImgRate = parseInt($('#obj_size_slider').val());
	
	ImgRate = (delta<0) ? ImgRate-10 : ImgRate+10;
	if(ImgRate>=300) ImgRate = 300;
	if(ImgRate<=70) ImgRate = 70;
	
	$( "#ImageObject" ).css({'width':parseInt(ImgOrlW * ImgRate / 100)+'px','height':parseInt(ImgOrlH * ImgRate / 100)+'px'});
	
	$('#obj_size_slider').val(ImgRate);
	
	if((ImgRate/100).toString().length == 1){
	  $( "#scale_info" ).html( ImgRate/100 +".0" );
	}else{
	  $( "#scale_info" ).html( ImgRate/100 );
	}  
	
	//修正如果圖片 跑出影像框  則定位於 框左上角
	var ImgPosNowT = $( "#ImageObject" ).offset().top;
	var ImgPosNowL = $( "#ImageObject" ).offset().left;
	var ImgNewW    = $( "#ImageObject" ).width()  
	var ImgNewH    = $( "#ImageObject" ).height()
	
	$( "#ImageObject" ).offset( {top:ImgBoxPosT,left:ImgBoxPosL+parseInt((ImgBoxW-ImgNewW)/2)} ); 
  }
  */
  
