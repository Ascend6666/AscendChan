(() => {
  if (window.AscendApi) return;

  const supabase = window.AscendSupabase;
  if (!supabase) {
    console.error("Supabase client is not initialized. Check CDN load or network.");
    return;
  }

  async function fetchThreadRow(board, threadNumber) {
    const { data, error } = await supabase
      .from("threads")
      .select("*")
      .eq("board_key", board)
      .eq("thread_number", threadNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  window.AscendApi = {
    async listThreads(board) {
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .eq("board_key", board)
        .eq("archived", false)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async listRecentThreads(limit = 8) {
      const { data, error } = await supabase
        .from("threads")
        .select("board_key, thread_number, subject, updated_at")
        .eq("archived", false)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    async getThread(board, threadNumber) {
      const thread = await fetchThreadRow(board, threadNumber);
      if (!thread) return null;

      const { data: replies, error } = await supabase
        .from("posts")
        .select("*")
        .eq("thread_id", thread.id)
        .is("deleted_at", null)
        .order("post_number", { ascending: true });

      if (error) throw error;

      return {
        ...thread,
        opPostId: "001",
        threadId: thread.thread_number,
        replies: (replies || []).map((reply) => ({
          ...reply,
          postId: String(reply.post_number).padStart(3, "0"),
        })),
      };
    },

    async createThread(board, subject, body) {
      const clientId = window.AscendClient.getClientId();
      const authorRole = window.AscendClient.getRole();

      const { data: latest, error: latestError } = await supabase
        .from("threads")
        .select("thread_number")
        .eq("board_key", board)
        .order("thread_number", { ascending: false })
        .limit(1);
      if (latestError) throw latestError;

      const nextThreadNumber = latest?.length ? Number(latest[0].thread_number) + 1 : 1;
      const { error } = await supabase.from("threads").insert({
        board_key: board,
        thread_number: nextThreadNumber,
        subject,
        body,
        reply_count: 0,
        author_role: authorRole,
        poster_client_id: clientId,
      });
      if (error) throw error;
      return nextThreadNumber;
    },

    async createReply(board, threadNumber, body) {
      const clientId = window.AscendClient.getClientId();
      const authorRole = window.AscendClient.getRole();
      const thread = await fetchThreadRow(board, threadNumber);
      if (!thread) throw new Error("Thread not found");

      const { data: latestReply, error: latestError } = await supabase
        .from("posts")
        .select("post_number")
        .eq("thread_id", thread.id)
        .order("post_number", { ascending: false })
        .limit(1);
      if (latestError) throw latestError;

      const nextPostNumber = latestReply?.length ? Number(latestReply[0].post_number) + 1 : 2;

      const { error: insertError } = await supabase.from("posts").insert({
        thread_id: thread.id,
        board_key: board,
        post_number: nextPostNumber,
        body,
        author_role: authorRole,
        poster_client_id: clientId,
      });
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("threads")
        .update({
          reply_count: Number(thread.reply_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", thread.id);
      if (updateError) throw updateError;

      return nextPostNumber;
    },

    async deletePost(board, threadNumber, postNumber) {
      const thread = await fetchThreadRow(board, threadNumber);
      if (!thread) throw new Error("Thread not found");

      const targetPostNumber = Number(postNumber);
      if (!Number.isFinite(targetPostNumber)) throw new Error("Invalid post number");

      const { error } = await supabase
        .from("posts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("thread_id", thread.id)
        .eq("post_number", targetPostNumber);
      if (error) throw error;
    },

    async deleteThread(board, threadNumber) {
      const thread = await fetchThreadRow(board, threadNumber);
      if (!thread) throw new Error("Thread not found");

      const { error } = await supabase
        .from("threads")
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq("id", thread.id);
      if (error) throw error;
    },

    async listBookmarks(board) {
      const clientId = window.AscendClient.getClientId();
      const query = supabase
        .from("bookmarks")
        .select("thread_id, threads!inner(board_key, thread_number, subject, updated_at, reply_count, pinned, locked, archived)")
        .eq("user_client_id", clientId);

      if (board) query.eq("threads.board_key", board);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row) => ({
        ...row.threads,
        threadId: row.threads.thread_number,
        thread_number: row.threads.thread_number,
        board_key: row.threads.board_key,
        reply_count: row.threads.reply_count,
      }));
    },

    async toggleBookmark(board, threadNumber) {
      const clientId = window.AscendClient.getClientId();
      const thread = await fetchThreadRow(board, threadNumber);
      if (!thread) return false;

      const { data: existing, error: existingError } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("thread_id", thread.id)
        .eq("user_client_id", clientId)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        const { error } = await supabase.from("bookmarks").delete().eq("id", existing.id);
        if (error) throw error;
        return false;
      }

      const { error } = await supabase.from("bookmarks").insert({
        thread_id: thread.id,
        user_client_id: clientId,
      });
      if (error) throw error;
      return true;
    },

    async createReport(board, threadNumber, postNumber, targetPosterClientId) {
      const thread = await fetchThreadRow(board, threadNumber);
      if (!thread) throw new Error("Thread not found");

      const { error } = await supabase.from("reports").insert({
        board_key: board,
        thread_id: thread.id,
        target_post_number: Number(postNumber),
        target_poster_client_id: targetPosterClientId || null,
        reason: "Reported from thread menu",
      });
      if (error) throw error;
    },
  };
})();
