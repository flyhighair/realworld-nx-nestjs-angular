import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IArticle, IComment } from '@realworld/article/api-interfaces';
import { IArticleService, ICommentService } from '@realworld/article/shared';
import { ActionSuccessResponse } from '@realworld/shared/client-server';
import { IProfile } from '@realworld/user/api-interfaces';
import { IProfileService, IUserService } from '@realworld/user/shared';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'realworld-view-article',
  templateUrl: './view-article.component.html',
  styleUrls: ['./view-article.component.scss']
})
export class ViewArticleComponent implements OnInit {
  article: IArticle
  comments: IComment[] = []
  destroyed = new Subject()
  commentForm: FormGroup

  constructor(
    public userService: IUserService,
    private articleService: IArticleService,
    private profileService: IProfileService,
    private commentService: ICommentService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) { 
    this.initCommentForm()
  }

  ngOnInit() {
    this.route.params
      .pipe(
        takeUntil(this.destroyed),
        tap(async p => {
          if (history?.state?.data) {
            this.article = history.state.data
          } else {
            let slug = p['slug']
            await this.loadArticle(slug)
          }

          if (this.userService.isAuth) {
            this.loadComments()
          }
        })
      )
      .subscribe()
  }

  ngOnDestroy() {
    this.destroyed.next()
    this.destroyed.complete()
  }

  async loadArticle(slug: string) {
    try {
      let res = await this.articleService.getOne(slug).toPromise()
      if (res && res.detailData) {
        this.article = res.detailData as IArticle
      } else {
        this.router.navigate(['/'])
      }
    } catch (error) {
      this.router.navigate(['/'])
      throw error
    }
  }

  async loadComments() {
    const res = await this.commentService.getAllComments(this.article?.slug).toPromise()
    this.comments = res.data || []
  }

  async postComment() {
    const res = await this.commentService.postComment(this.article?.slug, this.commentForm.value).toPromise()
    this.comments.unshift(res.data as IComment)
    this.commentForm.reset()
  }
  
  async deleteComment(id: string) {
    await this.commentService.deleteComments(this.article?.slug, id).toPromise()
    this.comments = this.comments.filter(c => c.id !== id)
  }

  async toggleFavorite($event: boolean) {
    if (!this.userService?.isAuth) {
      this.router.navigateByUrl('/login')
      return
    }
    let promise: Promise<ActionSuccessResponse<IArticle>>
    if ($event) {
      promise = this.articleService.favoriteArticle(this.article?.slug).toPromise()
    } else {
      promise = this.articleService.unfavoriteArticle(this.article?.slug).toPromise()
    }

    const res = await promise
    this.article = res.data as IArticle
  }

  async toggleFollow($event: boolean) {
    if (!this.userService?.isAuth) {
      this.router.navigateByUrl('/login')
      return
    }

    let promise: Promise<ActionSuccessResponse<IProfile>>
    if ($event) {
      promise = this.profileService.followAUser(this.article?.author?.username).toPromise()
    } else {
      promise = this.profileService.unfollowAUser(this.article?.author?.username).toPromise()
    }

    const res = await promise
    this.article.author = res.data as IProfile
  }

  async delete() {
    await this.articleService.delete(this.article?.slug).toPromise()
    this.router.navigateByUrl('/')
  }

  private initCommentForm() {
    this.commentForm = this.fb.group({
      body: [null, [Validators.required, Validators.maxLength(1000)]]
    })
  }

}
