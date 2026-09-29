  /* [ Client Archive Function Set ] */
  /* 檢索系統 JS Func */	
  
  
  $(window).on('load',function () {   //  || $(document).ready(function() {		
  
    
	$('#signin').click(function(){
	  location.href="index.php?act=Landing/account#signin";
	});
	
	
	$('#signout').click(function(){
	  if(!confirm("確定要登出系統?")){
	    return 0;
	  }    
      location.href="index.php?act=Landing/logout";
	});
	
	// 目錄顯示設定
	$('#listmode').change(function(){
	  $('.result_block').attr('listmode',$(this).val());
	})
	
	
	// 開關初始化
	$('.func_switch').each(function(){
	  var main_dom = $(this).parent();
      if(main_dom.next().is(":visible")){
		$(this).html('<i class="fa fa-minus-square" aria-hidden="true"></i>');  
	  }else{
		$(this).html('<i class="fa fa-plus-square" aria-hidden="true"></i>');  
	  }
	});
	
	// 功能開關
	$('.func_switch').click(function(){
	  var main_dom = $(this).parent();
      if(main_dom.next().is(":visible")){
		main_dom.next().hide();  
		$(this).html('<i class="fa fa-plus-square" aria-hidden="true"></i>');
	  }else{
		main_dom.next().show();  
	    $(this).html('<i class="fa fa-minus-square" aria-hidden="true"></i>');
	  }
	});
	
	
	// level switch
	$('li.level > .option').click(function(){
	  var dom = $(this).parent('li');
	  var option = (parseInt(dom.attr('switch')) ^ 1);
	  var code = dom.attr('id');
	  if(option){
		$("li.level[up='"+code+"']").show()    
	  }else{
		$("li.level[up^='"+code+"']").attr('switch', option ).hide(); 
	  }
	  dom.attr('switch', option );
	});
	
	// level search
	$('li.level > .name').click(function(){
      var dom = $(this).parent('li');
	  var code = dom.attr('id');
	  
	  /*
	  var level=[];
	  while(code.length){
        level.unshift($('#'+code).find('.name').text());
	    code = code.substr(0,(code.length-2));
	  }
	  */
	  var search = get_search_condition();
	  search['query'] = [];
	  search['query'][0] = {'field':'series','value':dom.data('set')}
	  location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	});
	
	// history more
	$('.list_more').click(function(){
      var list_dom = $(this).parent().prev();	  
	  var mode = list_dom.attr('mode');	
	  if(mode =='limit' ){
		list_dom.attr('mode','show');  
	  }else{
		list_dom.attr('mode','limit');    
	  }
	});
	
	
	// 搜尋模式開關
	$('li.mode_switch').click(function(){
	  $('.mode_switch.atthis').removeClass('atthis');
	  switch($(this).attr('id')){
	    case 'advance': $('#advance_search_block').css({'position':'relative','visibility': 'visible'});break;
	    case 'general': $('#advance_search_block').css({'position':'absolute','visibility': 'hidden'}); break;
		case 'initial': location.href='index.php'; return false; break;
	  }
	  $(this).addClass('atthis');
	});
	
	// 搜尋模式初始化
	if($('.mode_switch.atthis').length){
	  $('.mode_switch.atthis').trigger('click');
	}else{
	  $('.mode_switch:first').trigger('click');
	}
	
	// 查詢模式版面初始化
	if($('.zong_block').length){
	  $('#zong_block_switch').attr('switch',function(){
		return $('.zong_block').is(":visible") ? '1':'0';
	  });
	}
	
	// 查詢模式開關
	$('#zong_block_switch').click(function(){
	  $(this).attr('switch',function(){
		 return $(this).attr('switch')=='0' ? '1':'0'; 
	  });
      $('.zong_block').toggle(); 	  
	});
	
	// 欄位搜尋模式變換
	$('#search_field').change(function(){
	  var search_input_mode = $(this).find('option:selected').attr('mode');
      $('#search_input_mode > li').css('display','none');
	  $('#search_input_mode').find('li#'+search_input_mode).css('display','flex');
	});
	
	// 夾贅詞變更
	$('.ap_input').change(function(){
	  $(this).parent().find('.term_focus').val('');
	});
	
	
	// 進階查詢外掛
	
	// 增加條件
	$('#add_search_term').click(function(){
	  var new_search = $('.additional_search._template').clone();
      new_search.removeClass('_template');
	  new_search.find('input').val('');  	  
      new_search.find('select').val('');  	  
      new_search.appendTo('#additional_continer'); 
	});
	
	// 刪除條件
	$(document).on('click','.delete_search_add',function(){
	  if(!$(this).parents('li').hasClass('_template')){
		$(this).parents('li').remove();	  
	  }else{
		$(this).parents('li').children().val('');
		system_message_alert('','不可以刪除第一個');  
	  }
	});
	
	// 日期範圍
	if($(".date_bound").length){
	  if($('#select_date_null').is(':checked')){
		$('.date_bound').prop('disabled',true).css('opacity',0.3);
	  }
	}
	
	// 設定僅搜尋無日期
	$('#select_date_null').change(function(){
	  if($(this).is(':checked')){
		$('.date_bound').prop('disabled',true).css('opacity',0.3);
	  }else{
		$('.date_bound').prop('disabled',false).css('opacity',1);
	  }
	});
    
	// 重設日期範圍
	$('#reset_daterange_set').click(function(){
	  $('.date_bound').each(function(i){
		var date_string = $(this).data('default');
		$(this).val(date_string);  
	  });
	});
	
	// 重設類型篩選
	$('#reset_format_sel').click(function(){
	  $("input[name='format']").prop('checked',false);	
	});
	
	// 重設提供篩選
	$('#reset_retrieval_sel').click(function(){
	  $("input[name='retrieval']").prop('checked',false);	
	});
	
	// 重設全宗篩選
	$('#reset_zongrange_set').click(function(){
	  $('.zong_range').val('');	
	});
	
	
	
	
	
	// 取得檢索設定
	function get_search_condition(){
	  // 主檢索
	  var search = {};
	  
	  var search_field = $('#search_field').val();
	  
	  search['accnum'] = $("input[name='accnum']:checked").val();
	  search['query']  = [];
	  search['query'][0] = {'field':$('#search_field').val(),'value':''}
	  if( search_field == 'termpat'){
		search['query'][0]['attr']  = 't%';
		search['query'][0]['value'] = $('#termpat_search_input').val();
		search['query'][0]['value'] = $('#termpat_search_input_prev').val().length ? '{'+$('#termpat_search_input_prev').val()+'}'+search['query'][0]['value'] : search['query'][0]['value'];
		search['query'][0]['value'] = $('#termpat_search_input_back').val().length ? search['query'][0]['value']+'{'+$('#termpat_search_input_back').val()+'}': search['query'][0]['value'];
  	    search['query'][0]['value'] = $('#termpat_search_target').val().length ? search['query'][0]['value']+'@'+$('#termpat_search_target').val(): search['query'][0]['value']+'@';
	 }else if( search_field == 'clipterm'){
		search['query'][0]['attr']  = 'c%';
		search['query'][0]['value'] = $('#clipterm_search_input_prev').val()+'{'+$('#clipterm_search_input').val()+'}'+$('#clipterm_search_input_back').val();
		search['query'][0]['value'] = $('#clipterm_search_targte').val().length ? search['query'][0]['value']+'@'+$('#clipterm_search_targte').val(): search['query'][0]['value']+'@';
	  }else{
		search['query'][0]['value'] = $('#search_input').val();
	  }
	  
	  // 次檢索
      $('.additional_search').each(function(){
		var term = $(this).children('.term').val() ? $(this).children('.term').val() : '';
		if(!term){
		  return true;	
		}
		var attr = $(this).children('.attr').val() ? $(this).children('.attr').val() : '+';
		var field= $(this).children('.field').val() ? $(this).children('.field').val() : '_all';
		search['query'].push({'field':field,'value':term,'attr':attr})
	  });
      
	  // format
	  if($("input[name='format']:checked").length){
		search['format'] =  $("input[name='format']:checked").map(function(){return $(this).val();}).get();
	  }
	  
	  // retrieval 
	  if($("input[name='retrieval']:checked").length){
		search['retrieval'] =  $("input[name='retrieval']:checked").map(function(){return $(this).val();}).get();
	  }
	  
	  // zong
	  if($("input[name='zong_id']:checked").length){
		search['zong_id'] =  $("input[name='zong_id']:checked").map(function(){return $(this).val();}).get();
	  }
	  
	  // zong range
	  if($("input.zong_range").length &&  $("input.zong_range").map(function(){return $(this).val() ? 1 : 0}).get().reduce(function(a, b) {return a + b;} , 0) ){
		search['zongrange'] = {};
		if($("input#zong_start").val()) search['zongrange']['start'] =  $("input#zong_start").val();
		if($("input#zong_end").val()) search['zongrange']['end'] =  $("input#zong_end").val();
	  }
	  
	  // date
	  if($('#select_date_null:checked').length){
		search['yearnum'] = ['none'];  
	  }else{
		if( $('#date_range_start').val()!=$('#date_range_start').data('default') || $('#date_range_end').val()!==$('#date_range_end').data('default') ){
		  search['dayrange']=[$('#date_range_start').val(),$('#date_range_end').val()]  
	    }  
	  }	
	  
	  // domconf
	  search['domconf'] = {};
	  if($('._domconf').length){
		$('._domconf').each(function(){
          if($(this).hasClass('_setval')){
			search['domconf'][$(this).attr('id')] = $(this).val();  
		  }else if($(this).hasClass('_setshow')){ 	
		    search['domconf'][$(this).attr('id')] = $(this).css('display');  
		  }	  
		});  
	  }

      return search;		
	}
	
	
	
	
	// 送出查詢
	$('#search_submit').click(function(){
	  
		let search_field = $('#search_field').val();
		let search_check = true;
		  
		// 檢查搜尋內容
		switch(search_field){
			case 'termpat':
			  if(!$('#termpat_search_input').val().length){
				$('#termpat_search_input').focus();
				system_message_alert('error',"請輸入綴詞主體");	
				search_check = false;
			  }
			  
			  if( !$('#termpat_search_input_prev').val().length && !$('#termpat_search_input_back').val().length ){
				$('#termpat_search_input_prev').focus();
				system_message_alert('error',"請指定至少一個前後綴詞長度");	
				
				search_check = false;
			  }
			  break;
			
			case 'clipterm':
			  if(!$('#clipterm_search_input_prev').val().length || !$('#clipterm_search_input_back').val().length){
				$('#clipterm_search_input_prev').focus();  
				system_message_alert('error',"夾詞前後條件都必須填寫");	
				search_check = false;
			  }
			  break;
			
			default:
			   if(!$('#search_input').val().length ){
					if(!$("input[name='retrieval']:checked").length){
						system_message_alert('error',"請輸入搜尋條件");  
						search_check = false; 
					}  
			   }
			  break;
		}
	    
		if(!search_check){
			return false;  
		}
	  
	  
		if($(this).prop('disabled')){
			system_message_alert('',"系統正在查詢中，請稍候..");
			return false;    
	    }
	    $(this).prop('disabled',true);
	  
	    var search = get_search_condition();
	    
		// 增加全欄位搜尋限制
	    if($('#search_field').val()=='_all' && $('#search_input').val().split(" ").length > 10){
			if(!confirm("全欄位查詢的條件不可超過10項，請指定查詢目標欄位\n\n是否繼續執行查詢?,選擇[確定]系統將只使用前10個條件進行搜尋")){
				return false;
			}
		}
	  
	    location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	
	});
	
	
	// 全宗勾選
	$(".zselect").change(function(){
	  if($(this).prop('checked')){
		$(this).parents('li').addClass('selected');  
	  }else{
		$(this).parents('li').removeClass('selected');   
	  }
	});
	
	// 全宗查詢
	$('.zname').click(function(){
	  var zong = $(this).parent().attr('no');
      var search = get_search_condition();
	  search['query'] = [{'field':'zong_id','value':$(this).parent('li').attr('no'),'attr':'+'}];
	  location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	});
	
	
	// 後分類快速導覽

	// 後分類切換
	$('.facets_select').change(function(){
	  $('.term_list._domconf').hide();
      $('ul#'+ $(this).val()).show();
	  
	  if($('#filter_queue').length){ 
	    $('#filter_queue').empty();
        $(".filter[name!='"+$(this).val()+"']:checked").each(function(){
		  var dom = $(this).parent().clone() ;
		  dom.find('.filter').removeClass('filter').addClass('quick');
		  dom.appendTo($('#filter_queue'))
	    });
	  }
	});
	$('.facets_select').trigger('change');
	//$('input.filter').prop('checked',false);
	
	// 快速篩選區移除
	$(document).on('click','.quick',function(){
	  $(".filter[value='"+$(this).val()+"']").trigger('click');
	});
	
	// 後分類單選
	$(document).on('click','.term_name',function(){
	  var dom = $(this).prev();	
	  if(dom.hasClass('capture')){   // term capture mode diference
		$('.term_focus').val(dom.val());
	    var search = get_search_condition();
	  }else{
		var search = get_search_condition();  
		search['filter'] = {};
	    search['filter'][dom.attr('name')]=[dom.val()];  
	  }
	  location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	});
	
	
	// 後分類送出
	$(document).on('click','.filter',function(){
	  if($(this).prop('disabled')){
		system_message_alert('',"系統正在查詢中，請稍候..");
	    return false;    
	  }
	  //$(this).prop('disabled',true);
	  var search = get_search_condition();
	  
	  if($('.filter:checked').length){
        search['filter'] = {};
		
		$('#facetsby').find('option').each(function(){
		  var field = $(this).val();
		  if($(".filter[name='"+field+"']:checked").length){
			search['filter'][field] = $(".filter[name='"+field+"']:checked").map(function(){return $(this).val();}).get();  
		  }
		})
		/* 
		var field = $(this).attr('name');
        search['filter'][field] = $(".filter[name='"+field+"']:checked").map(function(){return $(this).val();}).get();
	    */ 
	  }
	  location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	});
	
	// 相關詞彙多選
	$(document).on('click','.capture',function(){
	  if($(this).prop('disabled')){
		system_message_alert('',"系統正在查詢中，請稍候..");
	    return false;    
	  }
	  if($('.capture:checked').length){
		var term_focus = $(".capture:checked").map(function(){return $(this).val(); }).get();
		$('.term_focus').val(term_focus.join('|'));	 
	  }
	  var search = get_search_condition();
	  
	  location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	});
	
	
	// 我的資料夾查詢
	$(document).on('click','.search_folder',function(){
	  var folder_name = $(this).parent().attr('folder');
	  $('#search_field').val('_folder');
	  $('#search_input').val(folder_name);
	  var search = get_search_condition();
	  location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	});
	
	// 調閱單查詢
	$('.act_apply_result').click(function(){
		const main_dom = $(this).parents('li.case');
	    const apply_code = main_dom.attr('no');
		location.href = 'index.php?act=Archive/myapply/'+apply_code; 	 	
	});
	
	// 調閱單查詢
	$('.act_apply_ticket').click(function(){
		const main_dom = $(this).parents('li.case');
	    const apply_code = main_dom.attr('no');
		location.href = 'index.php?act=Archive/apply#'+apply_code; 	 	
	});
	
	
	// 切換顯示模式
	$('.act_apply_view').click(function(){
		$('.apply_list#accept').attr('view',$(this).attr('status'))
		$('.act_apply_view').removeClass('thismode');
		$(this).addClass('thismode');
	})
	
	
	// 關閉申請紀錄
	$('.act_hide_applied').click(function(){
	  let record_dom = $(this).parents('li');	
	  var apply_code = record_dom.attr('no');
      $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Archive/applyhide/'+apply_code},
		  beforeSend: 	function(){ system_loading();  },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(!response.action){  
			  system_message_alert('',response.info);
			  return false;
			}
			
			record_dom.attr('view',0);
			
		  },
		  complete:		function(){   }
	  }).done(function() { system_loading();   });		
	});
	
	
	
	
	// 偵測是否出現重新設定
	var search_keyin;
	$('#search_input').bind( "mouseover focus keyup change", function(event) {
	  if($(this).val()){
		$('#act_reset_search').show() 
	  }else{
		$('#act_reset_search').hide()   
	  }	
	  
	  if($(this).val() && (search_keyin == $(this).val()) && event.keyCode==13){
		$('#search_submit').trigger('click');  
	  }else{
		search_keyin = $(this).val();  
	  }
	});
	
	/*
	$('#search_input').bind('focusout',function(event) {
	  $('#act_reset_search').hide();	
	});
	*/
	
	// 重新設定檢索條件
	$('#act_reset_search').click(function(){
	  $('.additional_search').each(function(){
		$(this).children('.term').val('');
		$(this).children('.attr').val('+');
		$(this).children('.field').val('_all');
		
	  });
      $('#reset_format_sel').trigger('click');	
      $('#reset_daterange_set').trigger('click');
	  $('#search_field').val('_all').trigger('change');
	  $('#search_input').val('').focus();
	  $('#reset_zongrange_set').trigger('click');	
	  $(this).hide();
	});
	
	
	
	// 跳頁
    $('.page_to').click(function(){  
	 if(!$(this).attr('page')){
	    return false;
	  }	
	  var link = location.search.replace('/#.*?$/','').split('/');
	  link[3] = $(this).attr('page');
	  location.search = link.join('/');
	});
	$('.page_jump').change(function(){
	  if(!$(this).val()){
	    return false;
	  }	
	  var link = location.search.replace('/#.*?$/','').split('/');
	  link[3] = $(this).val();
	  location.search = link.join('/');
	});
   	
	
	//- sortby
	$('#sortby').change(function(){
	  $('#search_submit').trigger('click');
	});
	
	
	//- paging
	$('#pageing').change(function(){
	  var new_paging='1-'+$(this).val();
	  var serch_set = location.search.split('/');	
      var last_attr = serch_set.pop();
	  if(last_attr.match(/\d+\-\d+/g)){
		serch_set.push(new_paging)  
	    location.search = serch_set.join('/');
	  }else{
		location.search+='/'+new_paging;
	  }
	});
	
	
	// 全選
	// select result all
	$('.result_selected_all').bind('click',function(){
	  var checkbox_state = $(this).prop("checked");
	  $('.result_selecter').prop("checked",checkbox_state);
	});
	 
	
	// 執行勾選項目
	$('#act_collect_active').click(function(){
	  
      let func_type = $('#act_collect_option').val(); 
      let export_type = $("input[name='user_select_target']:checked").val();
	  let active_dom = $(this);
	  
	  
	  if(!func_type){
		system_message_alert('','尚未選擇執行項目!!');    
	    return false;
	  }
	  
	  if(export_type=='page' ){
		if(!$('input.result_selecter:checked').length){
		  system_message_alert('','尚未選擇資料');  
	      return false;
		}  
	  }else{
		if(!export_type){
		  system_message_alert('','查詢無結果');  
	      return false;  
	    }
	  }
	  let metalist = [];
	  
	  switch(func_type){
		case 'cgdownload':
          if(export_type=='page' ){
			metalist = $('input.result_selecter:checked').map(function(){return $(this).val();}).get();
			window.open('index.php?act=Archive/export/page/'+encodeURIComponent(Base64.encode(JSON.stringify(metalist))));    
		  }else{
			window.open('index.php?act=Archive/export/result/'+encodeURIComponent(Base64.encode(export_type)));    
		  } 
          break;

        case 'cgprintout':   
		  if(export_type=='page' ){
			metalist = $('input.result_selecter:checked').map(function(){return $(this).val();}).get();
			window.open('index.php?act=Archive/printcata/page/'+encodeURIComponent(Base64.encode(JSON.stringify(metalist))));    
		  }else{
			window.open('index.php?act=Archive/printcata/result/'+encodeURIComponent(Base64.encode(export_type)));    
		  } 
          break; 
		  
		case 'cgsentmail':
		  let pasedata = '';
		  if(export_type=='page' ){
			metalist = $('input.result_selecter:checked').map(function(){return $(this).val();}).get();
			pasedata = encodeURIComponent(Base64.encode(JSON.stringify(metalist)));
		  }else{
			pasedata = encodeURIComponent(Base64.encode(export_type));			
		  } 
		  
		  $.ajax({
			url: 'index.php',
			type:'POST',
			dataType:'json',
			data: {act:'Archive/cgsentmail/'+export_type+'/'+pasedata},
			beforeSend: 	function(){ active_loading(active_dom,'initial'); },
			error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
			success: 		function(response) {
				if(!response.action){  
				  system_message_alert('',response.info);
				}
				system_message_alert('alert','已成功加入發送信件到'+response.data.mailer+'筆資料');
			},
			complete:		function(){   }
		  }).done(function(r) { active_loading(active_dom ,  r.action  );   });	
		  
		  
		  
		  break; 
		  
		  
		  
		case 'cgmoveout':  //移出目前資料夾
         
		  let folder_search  = $('#search_input').val();
		  
		  if($('#search_field').val()!='_folder' || !folder_search){
			system_message_alert('','目前未處於任何自訂收藏狀態');  
		    return false;
		  }
		  
		  // 設定勾選目標
		  if(export_type=='page' ){
			$('input.result_selecter:checked').each(function(){
			  let record = {};
			  record['collection'] = $(this).attr('collection');
			  record['identifier'] = $(this).attr('identifier');
			  metalist.push(record);
			});
		  }else{
			system_message_alert('','不提供將所有檢索結果放入我的收藏');  
			return false;  
		  }
		  
		  let moveout = {};
		  moveout['type'] = export_type=='page' ?  'page' : 'result';
		  moveout['save'] = folder_search;
		  moveout['data'] = export_type=='page' ? metalist : export_type;
		  let paser_json = encodeURIComponent(Base64.encode(JSON.stringify(moveout)));
		  
		  if(!confirm("確定要將勾選之 "+metalist.length+" 筆資料移出我的收藏『"+folder_search+"』?")){
			return false;  
		  }
		  
		  
		  $.ajax({
			url: 'index.php',
			type:'POST',
			dataType:'json',
			data: {act:'Archive/moveout/'+paser_json},
			beforeSend: 	function(){ active_loading(active_dom,'initial'); },
			error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
			success: 		function(response) {
				
				if(!response.action){  
				  system_message_alert('',response.info);
				}
				
				$('li.user_folder[folder="'+folder_search+'"]').find('.title').html(folder_search+' ('+response.data.total+')');
				$('#act_collect_option').find('option[ufolder="'+folder_search+'"]').html(folder_search+' ('+response.data.total+')');
				alert('已成功移出:'+response.data.accept+' 筆資料，將重新整理頁面');
				
				location.reload()  	
				
				
			},
			complete:		function(){   }
		  }).done(function(r) { active_loading(active_dom ,  r.action  );   });	
		  
		  break;    

		
		  
		  
        case 'cgcollect':
          let folder_option  = $('#act_collect_option').find('option:selected');		  
		  let folder_target  = folder_option.attr('ufolder');
		  
		  if(!folder_target){
			system_message_alert('','尚未選擇目標資料夾');  
		    return false;
		  }
		  
		  // 設定勾選目標
		  if(export_type=='page' ){
			$('input.result_selecter:checked').each(function(){
			  let record = {};
			  record['collection'] = $(this).attr('collection');
			  record['identifier'] = $(this).attr('identifier');
			  metalist.push(record);
			});
		  }else{
			system_message_alert('','不提供將所有檢索結果放入我的收藏');  
			return false;  
		  }
		  
		  let collect = {};
		  collect['type'] = export_type=='page' ?  'page' : 'result';
		  collect['save'] = folder_target;
		  collect['data'] = export_type=='page' ? metalist : export_type;
		  let paser_data = encodeURIComponent(Base64.encode(JSON.stringify(collect)));
		  
		  $.ajax({
			url: 'index.php',
			type:'POST',
			dataType:'json',
			data: {act:'Archive/collect/'+paser_data},
			beforeSend: 	function(){ active_loading(active_dom,'initial'); },
			error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
			success: 		function(response) {
				
				if(!response.action){  
				  system_message_alert('',response.info);
				}
				
				$('li.user_folder[folder="'+folder_target+'"]').find('.title').html(folder_target+' ('+response.data.total+')');
				folder_option.html(folder_target+' ('+response.data.total+')');
				system_message_alert('alert','已成功加入:'+response.data.accept+' 筆資料');
				
			},
			complete:		function(){   }
		  }).done(function(r) { active_loading(active_dom ,  r.action  );   });	
		  
		  break; 
	  
	  
	  
	  }
	  
	  $('#act_collect_option').val('cgdownload');
	   
	})
	
	// 搜尋卷所屬的件 20260311
	$(document).on('click','.act_search_case',function(){
		let record_dom = $(this).parents('.data_record');
		var search = get_search_condition();
		search['query'] = [{'field':'in_store_no','value':record_dom.find('.result_selecter').attr('collection'),'attr':'+'}];
		location.href = 'index.php?act=Archive/search/'+encodeURIComponent(Base64M.encode(JSON.stringify(search)));
	})
	
	
	/*== [] ==*/
	
	//我的資料夾
	
	$(document).on('click','.act_f_edit',function(){
	  let record_dom = $(this).parents('li.user_folder');
      record_dom.attr('mode','edit');
	})
	
	$(document).on('click','.act_f_save',function(){
	  let record_dom = $(this).parents('li.user_folder');
      let active_dom = $(this);
	  
	  if(!record_dom.find('.nameof_folder').val()){
		record_dom.find('.nameof_folder').focus();  
		system_message_alert('',"尚未設定資料夾名稱");  
	    return false;
	  }
	  
	  let folder = {};
	  folder['oldfolder'] = record_dom.attr('folder');
	  folder['newfolder'] = record_dom.find('.nameof_folder').val();
	  let paser_data = encodeURIComponent(Base64.encode(JSON.stringify(folder)));
	  
	  $.ajax({
		url: 'index.php',
		type:'POST',
		dataType:'json',
		data: {act:'Archive/foldersave/'+paser_data},
		beforeSend: 	function(){ system_loading() },
		error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		success: 		function(response) {
			if(!response.action){  
			  system_message_alert('',response.info);
			  return false;
			}
			
			if(!folder['oldfolder']){
				let dom = $('li.user_folder._template').clone()
				dom.removeClass('_template');
				dom.attr('folder',folder['newfolder']);
				dom.find('.search_folder').text(folder['newfolder']);
				dom.find('.nameof_folder').val(folder['newfolder']);
				dom.prependTo('#myfolders');
				$('#collect_folders').append("<option value='cgcollect' ufolder='"+folder['newfolder']+"'>加入 "+folder['newfolder']+"</option>");
				record_dom.find('.nameof_folder').val('');
			}else{
				record_dom.attr('folder',folder['newfolder']);
				record_dom.find('.search_folder').text(folder['newfolder']);
				record_dom.attr('mode','view');
				
				$('#act_collect_option').find('option[ufolder="'+folder['oldfolder']+'"]').html("加入 "+folder['newfolder']).attr('ufolder',folder['newfolder']);
			}
			
			system_message_alert('alert','已資料夾名稱儲存成功');
		},
		complete:		function(){   }
	  }).done(function(r) { system_loading();   });	
	  
	})
	

    //刪除資料夾	
	$(document).on('click','.act_f_dele',function(){
	  let record_dom = $(this).parents('li.user_folder');
      let active_dom = $(this);
	  
	  if(!record_dom.attr('folder')){
		system_message_alert('',"資料夾不存在");  
	    return false;
	  }
	  
	  let folder = {};
	  folder['oldfolder'] = record_dom.attr('folder');
	  let paser_data = encodeURIComponent(Base64.encode(JSON.stringify(folder)));
	  
	  $.ajax({
		url: 'index.php',
		type:'POST',
		dataType:'json',
		data: {act:'Archive/folderdele/'+paser_data},
		beforeSend: 	function(){ system_loading() },
		error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		success: 		function(response) {
			if(!response.action){  
			  system_message_alert('',response.info);
			  return false;
			}
			$('#act_collect_option').find('option[ufolder="'+folder['oldfolder']+'"]').remove();
			record_dom.remove();
			system_message_alert('alert','已資料夾已移除');
		},
		complete:		function(){   }
	  }).done(function(r) { system_loading();   });	
	  
	})
	
	
	// 調閱申請功能:加入|移出
	$('.apply,.reserve').click(function(){
	  var active_dom = $(this);  
	  var apply_code = $(this).data('code');
	  var apply_mode = parseInt($(this).attr('apply'));
	  
	  // 取消模式
	  if(apply_mode==1){
		  var apply = []; 	
		  apply.push(apply_code)
		  
		  /*
		  $('.result_selecter:checked').each(function(){
			apply.push($(this).val())  
		  });	
		  */	
			
		  if(!apply.length){
			system_message_alert('',"尚未選擇資料");  
			return false;
		  }

		  var list = encodeURIComponent(JSON.stringify(apply));
		  
		  $.ajax({
			  url: 'index.php',
			  type:'POST',
			  dataType:'json',
			  data: {act:'Archive/applydel/'+list},
			  beforeSend: 	function(){ active_loading(active_dom,'initial'); },
			  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
			  success: 		function(response) {
				if(response.action){  
				  $('#apply_count').html(response.data.total); 
				  system_message_alert('alert',"已移除 "+response.data.newadd+" 筆");
				  active_dom.attr('apply','0');
				}else{
				  system_message_alert('',response.info);
				}
			  },
			  complete:		function(){   }
		  }).done(function(r) { active_loading(active_dom , r.action );   });	
		  
	  }else if(apply_mode==2){
	    
		system_message_alert('',"資料正在申請處理中");  
	    return false;
		
	  }else{
		  var apply = []; 	
		  apply.push(apply_code)
		  
		  /*
		  $('.result_selecter:checked').each(function(){
			apply.push($(this).val())  
		  });	
		  */	
			
		  if(!apply.length){
			system_message_alert('',"尚未選擇資料");  
			return false;
		  }

		  var list = encodeURIComponent(JSON.stringify(apply));
		  
		  $.ajax({
			  url: 'index.php',
			  type:'POST',
			  dataType:'json',
			  data: {act:'Archive/applyadd/'+list},
			  beforeSend: 	function(){ active_loading(active_dom,'initial'); },
			  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
			  success: 		function(response) {
				if(response.action){  
				  $('#apply_count').html(response.data.total); 
				  system_message_alert('alert',"新加入 "+response.data.newadd+" 筆");
				  active_dom.attr('apply','1');
				}else{
				  system_message_alert('',response.info);
				}
			  },
			  complete:		function(){   }
		  }).done(function(r) { active_loading(active_dom ,  r.action  );   });	
	  }
	});
	
	
	
	
	// 線上閱覽功能啟動
	$(document).on('click','.online',function(){
	  var active_dom = $(this);	
	  var access_key = $(this).attr('acckey');
	  if(access_key.length != 32 ){
		system_message_alert('',"數位檔案讀取參數錯誤");  
	    return false;
	  }
	  
	  //-- 解決 click 後無法馬上open windows 造成 popout 被瀏覽器block的狀況
	  // reference : http://stackoverflow.com/questions/20822711/jquery-window-open-in-ajax-success-being-blocked
	  
	  newWindow = window.open("","_blank");
	     
	  $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Display/initial/'+access_key},
		  beforeSend: 	function(){ system_loading();  },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(response.action){  
			  newWindow.location.href = 'index.php?act=Display/'+response.data.display+'/'+response.data.resouse;
			  //location.href='index.php?act=Display/'+response.data.display+'/'+response.data.resouse; // 只能在本地視窗開啟
			  //window.open('index.php?act=Display/'+response.data.display+'/'+response.data.resouse,'_blank'); // 非馬上開啟造成被block
			}else{
			  newWindow.close();
			  system_message_alert('',response.info);
			}
		  },
		  complete:		function(){   }
	  }).done(function() { system_loading();   });	
	  
	});
	
	
	
	// 圖表
	if($('#query_chart').length &&  $('#query_chart').data('chart')){
	  
	  //var response = JSON.parse($('#query_chart').data('chart'));
	  var response = $('#query_chart').data('chart');
	  $('#query_chart').highcharts({
	    
		chart: {
	        renderTo: 'query_chart',
            type: 'column',
	        spacingRight:20,
			alignTicks:false,
			backgroundColor:'rgba(255, 255, 255, 0.1)'
        },
		accessibility:{
			enabled: false
		},
        title: {
          text: ''
        },
        yAxis: {
	      min: 0,
		  lineWidth: 1,
	      gridLineDashStyle:'dash',
		  //minorGridLineDashStyle: 'dash',
          //minorTickInterval: 'auto',
		  tickInterval:response.tick,
          title: {
            text: 'Data amount'
          }
        },
	    
	    xAxis: {
	      lineWidth:1,
	      lineColor: '#888888',
	      showLastLabel:true,
	      categories:response.category,
          labels: {align:'center'},
	      tickInterval :10,
	      tickLength:5
	    },
		plotOptions: {
          series: {
            borderWidth: 0,
            borderColor: '#FFFFFF'
          }
	    },
	    legend: {
          enabled:false,             
  		  layout: 'vertical',
          backgroundColor: 'rgba(255,255,255,0)',
          align: 'left',
          verticalAlign: 'top',
          x: 50,
          y: 0,
          floating: true,
          shadow: true
        },
		series: [{ name: 'count', data:response.data }]
		
      });
	  $("text:contains('Highcharts.com')").css('opacity','0');	
	}
	
	
	// 進入調閱申請頁面
	$('#act_apply_submit').click(function(){
	  var apply_count = parseInt($('#apply_count').html());
      if(!apply_count){
		system_message_alert('',"尚未選擇資料");  
	    return false;
	  }
	  location.href="index.php?act=Archive/apply";
	});
	
	
	// 進入大圖申請申請頁面
	$('#act_apply_export').click(function(){
	    
	    location.href="index.php?act=Archive/dorequest";
	});
	
	
	/*========================*/
	/*-- Apply Function set --*/
	/*========================*/
	
	
	//-- step control
	$('.progress li.step').click(function(){
	  
      if($(this).hasClass('.currency')){
		return false;  
	  }
	  
	  var step_block = $(this).data("section");
	  
	  if(!$('#'+step_block).length){
		return false;  
	  }
	  
	  if(  $(this).prev().length  && !$(this).prev().hasClass('checked')){
		system_message_alert('','請先完成目前步驟!');  
	    return false;
	  }
	  
	  $('.booking_step').hide();
	  $('#'+step_block).show();
	  
	  $('.currency').removeClass('currency');
	  $(this).addClass('currency');
	  
	});
	
	
	/*--  STEP Function  --*/
	
	
	//-- step 2 
	$('#agreement').click(function(){
	  if($(this).prop('checked')){
		$("li.step[data-section='agrement_checker']").addClass('checked');
		$(document).scrollTop(0);
		$("li.step.currency").next().trigger('click');
	  }else{
		$("li.step[data-section='agrement_checker']").trigger('click');
        $("li.step[data-section='agrement_checker']").removeClass('checked');		
	  }
	});
	
	//-- step 3 
	
	$('.booking_date').focus(function(){
	  
	  if(!parseInt($(this).attr('picker'))){
		
		var archive_conf = $('#archive_config').data('set');
		var archive_quta = $('#archive_bookqt').data('set');
		var booking_days = parseInt(archive_conf['_CONFIG_BOOK_ACCEPT_DATES']) ? parseInt(archive_conf['_CONFIG_BOOK_ACCEPT_DATES']) : 21;
		 
	    let date_forbook = {};
		
		$(this).dateRangePicker({
			language:'tw',
			autoClose: false,
			customTopBar: '預約到館閱覽日期',
			autoClose: true,
			singleDate : true,
			showShortcuts: false,
			startDate: new Date(),
			endDate:moment().add(booking_days,'days'),
			customOpenAnimation: function(cb){
			    $(this).fadeIn(300, cb);
			},
			beforeShowDay: function(t)
			{
				var valid = !(t.getDay() == 0 || t.getDay() == 6);  //disable saturday and sunday
				var _class = '';
				var _tooltip = valid ? '' : '假日不開放申請';
				
				var tday = moment(t).format('YYYY-MM-DD'); 
				 
				 
				//#新增停止服務設定  20250912
				let drnh_stop_dates = [
					{'from':'2025-10-06','stop':'2025-10-06','reason':'中秋節（國定假日）'},
					{'from':'2025-10-10','stop':'2025-10-10','reason':'國慶日（國定假日）'},
					{'from':'2025-10-24','stop':'2025-10-24','reason':'臺灣光復暨金門古寧頭大捷紀念日補假'},
					{'from':'2026-01-01','stop':'2026-01-01','reason':'元旦（國定假日）'},
					{'from':'2026-10-09','stop':'2026-10-09','reason':'國慶日（國慶日補假休館）'},
				]; 
				 
				//含有停止申請設定 
				if(  typeof archive_conf['_CONFIG_BOOK_STOP_DATE_F'] != 'undefined' 
					 && typeof archive_conf['_CONFIG_BOOK_STOP_DATE_E'] != 'undefined'
					 && archive_conf['_CONFIG_BOOK_STOP_DATE_F'].match(/^\d\d\d\d\-\d+\-\d+$/) 
					 && archive_conf['_CONFIG_BOOK_STOP_DATE_E'].match(/^\d\d\d\d\-\d+\-\d+$/) 
				)
				{
					drnh_stop_dates.push({
						'from':archive_conf['_CONFIG_BOOK_STOP_DATE_F'],
						'stop':archive_conf['_CONFIG_BOOK_STOP_DATE_E'],
						'reason':archive_conf['_CONFIG_BOOK_STOP_REASON']
					})
				}
				 
				drnh_stop_dates.forEach(function(stopconf){ 
					let stop_from = moment(stopconf['from']).format('x');
					let stop_end  = moment(stopconf['stop']+' 23:59:59').format('x');
					let active_t  = moment(t).format('x');
				   
					if( active_t >= stop_from && active_t <=stop_end ){  
					  valid = false;  
					  _tooltip = stopconf.reason;  
					}
				})
				
				
				// 補班日期開放
				let workday = [];//['2020-02-15','2020-06-20','2020-09-26'];
				if(  typeof archive_conf['_CONFIG_BOOK_MUST_OPEN_DATES'] != 'undefined' ){
					workday = archive_conf['_CONFIG_BOOK_MUST_OPEN_DATES'].split(',')
				}
				workday.forEach(function(wday){
					if(wday==moment(t).format('YYYY-MM-DD')){
						valid = true;
						_tooltip = '';
						return true;
					}  
				});
				 
				date_forbook[tday] = valid; 
				 
				//額度已滿
				if( date_forbook[tday] && typeof archive_quta[tday]!='undefined' && parseInt(archive_quta[tday])==0){
					valid = false;  
					_tooltip = "本日預約已達人數上限";  
				}else if(date_forbook[tday] &&  typeof archive_quta[tday]=='undefined'){
					valid = false;  
					_tooltip = "本日暫不開放預約";  
				}
				
				// 可以申請的日數
				date_forbook[tday] = valid;
				
				
				return [valid,_class,_tooltip];
			},
			showDateFilter: function(time, date)  
			{
			   
			  
			  var date_index = moment(time).format('YYYY-MM-DD');
			  var _type  = '';
			  
			  
			  if(typeof date_forbook[date_index]!='undefined' && date_forbook[date_index] ){
				  
				  // 有效的申請日期檢查是否額度足夠
				   
				  var info = '<i class="fa fa-ban" aria-hidden="true"></i>';
				  var hint = '本日額度已達上限';
				  
				  if(typeof archive_quta[date_index]!='undefined'){
					if(parseInt(archive_quta[date_index]) > 0){
						info = parseInt(archive_quta[date_index]);	  
						hint = '本日尚可申請 '+info+' 人';
					}else if(parseInt(archive_quta[date_index]) < -90){
						info = '<i class="fa fa-check" aria-hidden="true"></i>';	  
						hint = '您已申請本日到館閱覽';
					}
					/*
					if(parseInt(date_config[date_index]['wait'])){
						hint = hint+', 已抽籤須等待候補';	
						info = info+'<div style="color:red;">候補中</div>';
					}
					*/
				  } 
					
				    return '<div style="min-width:20px;padding:0 5px;" title="'+hint+'">\
							<span style="font-weight:bold">'+date+'</span>\
							<div style="margin-top:5px;opacity:0.7;" >'+info+'</div>\
						</div>';
			  }else{
				    return  '<div style="min-width:20px;padding:0 5px;" title="不開放申請">\
								<span style="font-weight:bold">'+date+'</span>\
								<div style="margin-top:5px;opacity:0.3;" ><i class="fa fa-ban" aria-hidden="true"></i></div>\
							</div>';
			  }
			}
	    }).attr('picker',1);   
	  }
	 	
	});
	
    
	var collection_limit = /^\d+$/.test($('#apply_col_upbound').data('limit')) ? parseInt($('#apply_col_upbound').data('limit')) : 9999999;
	var digitalpag_limit = /^\d+$/.test($('#apply_img_upbound').data('limit')) ? parseInt($('#apply_img_upbound').data('limit')) : 9999999;
	 
	
	var apply_code       = '';
	//-- apply sort
	$( "#apply_array" ).sortable({
      placeholder: "ui-state-highlight",
	  start: function( event, ui ) {
		$('tr.upbound').remove();  
	  },
	  beforeStop: function( event, ui ) {
		$('tr.record').each(function(i){
			$(this).find('.apply_order').html((i+1));
		});  
	  },
	  stop: function( event, ui ) {
		recheck_apply_list();  
	  }
    });
    $( "#apply_array" ).disableSelection();
	
	// 原件閱覽可排序 #20250721
	$("#booking_array ").sortable({
		 placeholder: "ui-state-highlight",
	});
	
	
	//-- apply reason other
	$('#apply_reason').change(function(){
	  var reason = $(this).val();
	  var info = $(this).find('option:selected').data('info');	
	  
	  if(reason=='personal' ||  reason=='other'){
		$('#apply_reason_input').attr('placeholder',info).show().focus();  
	  }else{
		$('#apply_reason_input').attr('placeholder','').val('').hide();    
	  }
	});
	
	
	//-- apply limit checked initial
	if($('.apply_element').length){
	  recheck_apply_list();
	}
	
	//-- check apply list 
	function recheck_apply_list(){
	  var collection = 0;
	  var digitalpage= 0;
	  var applycount = 0;
	  
	  return true; // 系統已不再顯示檢測額度上限警示 #20250828@100
	  
	  $('tr.upbound').remove();
	  $('#apply_final_count').html($(".apply_element[keep='1']").length);
	  $('.apply_element').each(function(){
		
		if(!parseInt($(this).attr('keep')) ){
		  return true;	
		}
		
		if(parseInt( $(this).find('.digital_page_count').text())){
			
		  digitalpage+=parseInt( $(this).find('.digital_page_count').text()) ? parseInt( $(this).find('.digital_page_count').text()) : 0;	
		}else{
		  collection+=parseInt($(this).find('.collection_count').text());	
		}
		
		if(collection < collection_limit || digitalpage < digitalpag_limit){
		  applycount++;
		  return true;	
		}
		var upbound = $('<tr/>').addClass('upbound');
		upbound.append("<td colspan=2> 以下超過單次申請上限，將不會在本次送出，但仍會保留在清單中 </td>");
		upbound.append("<td align=center> "+collection+" </td>");
		upbound.append("<td align=center> "+digitalpage+" </td>");
		upbound.append("<td ></td>");
		$(this).after(upbound);
		$('#apply_final_count').html(applycount);
		return false;
		
	  });
	  
	}
	
	//-- remove apply list
	$('.apply_ignore').click(function(){
	  var main_dom = $(this).parents('.apply_element');
	  main_dom.attr('keep',0).appendTo('#apply_discard');
	  recheck_apply_list()
	});
	
	//-- return apply list
	$('.apply_return').click(function(){
	  var main_dom = $(this).parents('.apply_element');
	  main_dom.attr('keep',1).appendTo('#apply_array');
	  recheck_apply_list()
	});
	
	//-- remove apply booking
	$('.apply_remove').click(function(){
	  var main_dom = $(this).parents('.apply_element');
	  var apply= [main_dom.attr('no')];
	  var list = encodeURIComponent(JSON.stringify(apply));
	  var apply_count = parseInt($('#apply_count').text());
	  $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Archive/applydel/'+list},
		  beforeSend: 	function(){ system_loading() },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(response.action){  
			  main_dom.remove();
			  $('#apply_count').text((apply_count-1));
			}else{
			  system_message_alert('',response.info);
			}
		  },
		  complete:		function(){   }
	  }).done(function(r) { system_loading()   });
	});
	
	//-- remove apply booking
	$('.apply_delete').click(function(){
	  var main_dom = $(this).parents('.booking_element');
	  var apply= [main_dom.attr('no')];
	  var list = encodeURIComponent(JSON.stringify(apply));
	  var apply_count = parseInt($('#apply_count').text());
	  $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Archive/applydel/'+list},
		  beforeSend: 	function(){ system_loading() },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(response.action){  
			  main_dom.remove();
			  $('#apply_count').text((apply_count-1));
			}else{
			  system_message_alert('',response.info);
			}
		  },
		  complete:		function(){   }
	  }).done(function(r) { system_loading()   });
	});
	
	
	
	
	//-- final data submit
	$('#apply_submit').click(function(){
      
	  var apply_submit = {};
      apply_submit.applyto = [];
	  apply_submit.booking = {};
      apply_submit.discard = [];
      apply_submit.copymod = {};
	  apply_submit.pagenum = 0;
	  apply_submit.booknum = 0;
	  
      
	  var apply_reason = '';
	  if($('#apply_reason').val()=='personal' || $('#apply_reason').val()=='other'){
		apply_reason  = $('#apply_reason_input').val();
	  }else{
		apply_reason  = $('#apply_reason').val();  
	  }
	  if(!apply_reason){
		system_message_alert('',"請輸入申請目的");
	    return false;
	  }
	  apply_submit.reason = apply_reason;
	  
	  // 設定調閱申請
      let item_page_in_quota = 0; // check item in quota
	  
	  $('.apply_element').each(function(){
		var apply_code = $(this).attr('no');  
		var apply_mode = parseInt($(this).attr('keep'));
		
		if(apply_mode){
		    
			apply_submit.applyto.push(apply_code);
		    
			let pagenum = parseInt($(this).find('.digital_page_count').text())
		    if(pagenum){
				
				apply_submit.pagenum = apply_submit.pagenum+pagenum;
				
				if(pagenum <= digitalpag_limit){
					item_page_in_quota++;
				}
				
		    }else{
				apply_submit.booknum++;
			}
			
		}else{
		  apply_submit.discard.push(apply_code);
		}
		apply_submit.copymod[apply_code] = $(this).find('.copy_mode').map(function(){ if( $(this).prop('checked') ) return $(this).val();  }).get().join(';');
	  });
	  
	  // 設定原件閱覽
	  $('.booking_element').each(function(){
		var apply_code = $(this).attr('no');  
		var booking_date = $(this).find('.booking_date').val();
		if(booking_date){
		  apply_submit.booking[apply_code]=booking_date;   
		}
		apply_submit.copymod[apply_code] = $(this).find('.copy_mode').map(function(){ if( $(this).prop('checked') ) return $(this).val();  }).get().join(';');
	  });
	  
	  // 檢驗是否為空單
	  if( 
	    (Object.keys(apply_submit.booking).length <= 0) && 
		(
			(apply_submit.booknum > 0 && apply_submit.pagenum <=0 && collection_limit<=0 ) || 
			(apply_submit.pagenum > 0 && apply_submit.booknum <=0 && item_page_in_quota<=0 ) ||
			(apply_submit.pagenum > 0 && apply_submit.booknum >0  && item_page_in_quota<=0 && collection_limit<=0) 
	    ) 
	  )
	  {
		system_message_alert('',"目前申請額度不足，無法提出申請");
	    return false;  
	  }
	  
	  
	  var apply_data = encodeURIComponent(Base64.encode(JSON.stringify(apply_submit)));
	  $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Archive/applyfor/'+apply_data},
		  beforeSend: 	function(){ system_loading();  },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(response.action){  
			  apply_code = response.data;
			  $("li.step[data-section='booking_form']").addClass('checked');
		      $(document).scrollTop(0);
		      $("li.step.currency").next().addClass('loading').trigger('click');
			  process_apply_list(apply_code,apply_data);			
			}else{
			  system_message_alert('',response.info);
			}
		  },
		  complete:		function(){   }
	  }).done(function() { system_loading();   });
	});
	
	
	//-- process apply 
	function process_apply_list(apply_id,apply_data){
	  $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Archive/applied/'+apply_id+'/'+apply_data},
		  beforeSend: 	function(){ system_loading();  },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(response.action){  
			  var dom = $("<li/>").addClass('case submit myapply').attr('no',response.data.code);
			  dom.append("<span class='number'>"+response.data.code+"</span>");
			  dom.append("<span class='date'>"+response.data.date+"</span>");
			  dom.append("<span class='state'>"+response.data.status+"</span>");
			  $('#accept').prepend(dom);
			  $("li.step.currency").removeClass('loading').addClass('checked').next().data('apply',response.data.code);
			  $("#apply_count").html(response.data.queue)
			  
			}else{
			  $("li.step.currency").removeClass('loading').prev().trigger('click');
              system_message_alert('',response.info);
			}
		  },
		  complete:		function(){  $("li.myapply:nth-child(1)").trigger('click') }
	  }).done(function() { system_loading();   }); 	
		
	}
	
	//-- download apply license
    $('#apply_license').click(function(){
		let apply_code = $(this).data('apply');
		
		if(!apply_code){
		  system_message_alert('',"錯誤的序號");  
	      return false;
	    }
        window.open('index.php?act=Archive/applylicense/'+apply_code);
	});   
	
	//-- get apply result
	$(document).on('click','.myapply',function(){
	  var apply_code = $(this).attr('no');
      
	  if(!apply_code){
		system_message_alert('',"申請資料尚未送出");  
	    return false;
	  }
	  
	  $('#apply_license_queue').empty();
	  
      $.ajax({
		  url: 'index.php',
		  type:'POST',
		  dataType:'json',
		  data: {act:'Archive/applyask/'+apply_code},
		  beforeSend: 	function(){ system_loading();  },
		  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
		  success: 		function(response) {
			if(response.action){  
              
			  $.each(response.data.list,function(i,record){
			    var dom = $("<tr/>").attr({'code':record.code,'item':record.item});
 				dom.append("<td>"+record.no+"</td>");
				dom.append("<td>"+record.zong+"</td>");
				dom.append("<td>"+record.store+"</td>");
				dom.append("<td>"+record.title+"</td>");
				dom.append("<td>"+record.provide+"</td>");
				dom.append("<td>"+record.check+"</td>");
				dom.append("<td  style='text-align:center;'>"+record.option+"</td>");
				dom.appendTo($('#apply_license_queue'));
			  });
			  
			  // insert data
			  $('#apply_license_code').html(apply_code);
			  $('#apply_license_user').html(response.data.user.user_name);
			  $('#apply_license_date').html(response.data.date);
              $('#apply_license_case_num').html(response.data.data_count);
			  $('#apply_license_page_num').html(response.data.page_count);
			  
			  // 
			  $("li.step").removeClass('currency').addClass('checked');
			  $("li.step:last-child").addClass('currency').trigger('click');
			  
			  $('#apply_license').data('apply',apply_code);
			  
			}else{
			  system_message_alert('',response.info);
			}
		  },
		  complete:		function(){   }
	  }).done(function() { system_loading();   }); 
       
	   
	   
	   
	  //-- cancel apply ticket 
	  $(document).on('click','#act_cancel_ticket',function(){
		  
		  if(!confirm("即將取消整張申請單，請再次確認是否取消!?")){
			return false;  
		  }
		  
		  $.ajax({
			  url: 'index.php',
			  type:'POST',
			  dataType:'json',
			  data: {act:'Archive/applycancel/'+$('#apply_license_code').text()+'/_ALL'},
			  beforeSend: 	function(){ system_loading() },
			  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
			  success: 		function(response) {
				if(!response.action){  
				    system_message_alert('',response.info);
				    return false;
				} 
			    
				// 標記資料取消
				$('#apply_license_queue').find('tr').each(function(){
					$(this).find('td:nth-child(7)').html('已取消');
					$(this).find('td:nth-child(5)').append('<div class="cancelmark">使用者於'+response.data.canceldate+'取消</div>');
				})
				$('#apply_license_case_num').text(0);	
				system_message_alert('alert',"申請單已取消");
				
			  },
			  complete:		function(){   }
		  }).done(function(r) { system_loading()   });  
		  
	  })
	   
	  //-- cancel apply item
	  $(document).on('click','.apply_cancel',function(){
		  var main_dom = $(this).parents('tr');
		  var apply= {
			    code:main_dom.attr('code'),
			    item:main_dom.attr('item')
		  };
		  
		  
		  if(!confirm("即將取消目標項目之閱覽申請，請再次確認是否取消!?")){
			return false;  
		  }
		  
		  var apply_count = parseInt($('#apply_license_case_num').text());
		  $.ajax({
			  url: 'index.php',
			  type:'POST',
			  dataType:'json',
			  data: {act:'Archive/applycancel/'+apply.code+'/'+apply.item},
			  beforeSend: 	function(){ system_loading() },
			  error: 		function(xhr, ajaxOptions, thrownError) {  console.log( ajaxOptions+" / "+thrownError);},
			  success: 		function(response) {
				if(!response.action){  
				    system_message_alert('',response.info);
				    return false;
				} 
				
				if(response.data.type=='item'){
				     
				    let tddom = main_dom.find('.apply_cancel').parent();
					tddom.find('.apply_cancel').remove().end().text('已取消');
					tddom.find('td:nth-child(5)').append('<div class="cancelmark">使用者於'+response.data.canceldate+'取消</div>');
					$('#apply_license_case_num').text((apply_count-1));
					
				}else if(response.data.type=='ticket'){
				   // 標記資料取消
					$('#apply_license_queue').find('tr').each(function(){
						$(this).find('td:nth-child(7)').html('已取消');
						$(this).find('td:nth-child(5)').append('<div class="cancelmark">使用者於'+response.data.canceldate+'取消</div>');
						
					})
					$('#apply_license_case_num').text(0);					
				}
				
			  },
			  complete:		function(){   }
		  }).done(function(r) { system_loading()   });
	  });
	   
	   
	 
	});
	
	
	//測試並跳轉准駁單
	
	if(location.href.indexOf("Archive/apply#") > -1 && location.hash.match(/^#AHAS\d+$/)){
		// initial account data  //帶有參數的網址連結資料
		let apply_id  = location.hash.replace(/^#/,'').replace(/@.*?$/,'');
		let apply_dom = $('li.myapply[no="'+apply_id+'"]');
		
		console.log(apply_id)
		
		if(!apply_dom.length){ 
		   return false;
		}
		apply_dom.trigger('click');
	}
	
  
  });
  
  
  
  
  
  
  //***** ----- Search Field Check  ------ ******
  //測試是否有搜尋資料 以及防止多重送出
  function UserSearchSubmit(){
    $('#search_submit').trigger('click');
	return false;
  } 
  
  